"""Celery tasks for asynchronous AI generation."""

import asyncio
import base64
import io
from datetime import datetime, timezone
import logging
import mimetypes
from pathlib import Path
from urllib.parse import urlparse
import uuid
from typing import Optional

import httpx
from sqlalchemy import MetaData, Table, inspect, text
from sqlalchemy.exc import IntegrityError

from core.database import SessionLocal
from models.media import MediaType
from worker.celery_app import celery_app
from services.alibaba_api import alibaba_client
from services.model_config import (
    get_image_model,
    get_video_model,
    get_cost_usd,
)
from services.prompt_engineer import build_image_prompt, build_negative_prompt, build_video_prompt
from services.storage import storage_client, upload_to_oss, _BACKEND_DIR

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _url_to_base64_data_uri(url: str) -> str:
    """Convert a localhost media URL to a base64 data URI readable by DashScope.

    DashScope limits data URIs to 10 MB. Images are resized and re-compressed
    with Pillow until they fit, preserving aspect ratio.
    """
    from PIL import Image  # imported here to avoid hard dep at module level

    DASHSCOPE_MAX_BYTES = 9 * 1024 * 1024  # 9 MB — leave headroom under the 10 MB cap
    MAX_DIMENSION = 1920  # never send a side larger than this

    parsed = urlparse(url)
    path = parsed.path  # e.g. /media/references/uuid.jpg
    if path.startswith("/media/"):
        relative_key = path[len("/media/"):]
    else:
        relative_key = path.lstrip("/")

    local_path = _BACKEND_DIR / "media" / relative_key
    if not local_path.exists():
        logger.warning("Reference image not found locally: %s", local_path)
        return url

    raw = local_path.read_bytes()

    # Fast path: already small enough, just encode as-is
    if len(raw) <= DASHSCOPE_MAX_BYTES:
        mime, _ = mimetypes.guess_type(str(local_path))
        mime = mime or "image/jpeg"
        encoded = base64.b64encode(raw).decode("ascii")
        return f"data:{mime};base64,{encoded}"

    # Need to shrink: open with Pillow, downscale + re-compress iteratively
    img = Image.open(io.BytesIO(raw)).convert("RGB")

    # Downscale if any side exceeds MAX_DIMENSION
    w, h = img.size
    if max(w, h) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    quality = 85
    while quality >= 20:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        data = buf.getvalue()
        if len(data) <= DASHSCOPE_MAX_BYTES:
            encoded = base64.b64encode(data).decode("ascii")
            logger.info(
                "Compressed reference image from %d KB to %d KB (quality=%d)",
                len(raw) // 1024,
                len(data) // 1024,
                quality,
            )
            return f"data:image/jpeg;base64,{encoded}"
        quality -= 15

    # Last resort: halve dimensions and try again at quality 60
    w, h = img.size
    img = img.resize((w // 2, h // 2), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=60, optimize=True)
    data = buf.getvalue()
    encoded = base64.b64encode(data).decode("ascii")
    logger.warning(
        "Reference image still large after compression (%d KB), sending anyway", len(data) // 1024
    )
    return f"data:image/jpeg;base64,{encoded}"


def _resolve_reference_urls(urls: Optional[list[str]]) -> Optional[list[str]]:
    """Convert any localhost reference URLs to base64 data URIs for DashScope."""
    if not urls:
        return urls
    result = []
    for url in urls:
        parsed = urlparse(url)
        is_local = parsed.hostname in ("localhost", "127.0.0.1", "::1") or not parsed.scheme
        if is_local:
            logger.info("Converting local reference image to base64: %s", url)
            result.append(_url_to_base64_data_uri(url))
        else:
            result.append(url)
    return result


def _should_retry_generation_error(exc: Exception) -> bool:
    """Retry only transient upstream failures, not auth/configuration issues."""
    if isinstance(exc, RuntimeError):
        return False
    if isinstance(exc, IntegrityError):
        return False
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        if status_code in {400, 401, 403, 404, 422}:
            return False
    return True


@celery_app.task(bind=True, name="worker.tasks.generate_image_task", max_retries=3)
def generate_image_task(
    self,
    *,
    prompt: str,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    reference_image_urls: Optional[list[str]] = None,
    num_images: int = 1,
    model: str = "qwen-image-2.0-pro",
    style: Optional[str] = None,
    user_id: str,
    template_id: Optional[str] = None,
    parent_media_id: Optional[str] = None,
) -> dict:
    """Generate an image via Alibaba Model Studio and upload to storage.

    Auto-selects the correct Wan2.x model based on whether reference images are
    provided, overriding any caller-supplied model value.

    Returns a dict with ``storage_urls`` and ``count``.
    """
    try:
        has_refs = bool(reference_image_urls)
        selected_model = get_image_model(has_refs)
        cost = get_cost_usd(selected_model)

        from services.prompt_service import build_final_prompt, get_active_system_prompt, get_template_content

        with SessionLocal() as db:
            sys_prompt = get_active_system_prompt(db)
            tmpl_content = get_template_content(db, template_id) if template_id else None

        final_prompt = build_final_prompt(sys_prompt, tmpl_content, prompt)

        enriched_prompt = build_image_prompt(final_prompt, style=style)
        enriched_negative = build_negative_prompt(negative_prompt or None)

        # Convert localhost URLs to base64 data URIs so DashScope can read them
        resolved_refs = _resolve_reference_urls(reference_image_urls)
        # For image-to-image, pass only the first reference image
        ref_b64 = resolved_refs[0] if resolved_refs else None

        logger.info(
            "Submitting image generation: user=%s model=%s has_refs=%s",
            user_id, selected_model, has_refs,
        )
        response = _run_async(
            alibaba_client.generate_wan_image(
                prompt=enriched_prompt,
                model=selected_model,
                negative_prompt=enriched_negative,
                width=width,
                height=height,
                ref_image_b64=ref_b64,
                n=max(1, num_images),
            )
        )

        image_urls = _extract_image_urls(response)
        alibaba_task_id = response.get("output", {}).get("task_id")
        if not image_urls and alibaba_task_id:
            result = _poll_alibaba_task(alibaba_task_id)
            image_urls = _extract_image_urls(result)

        if not image_urls:
            raise ValueError(f"No image URL found in Alibaba response: {response}")

        storage_urls: list[str] = []
        for image_url in image_urls[: max(1, num_images)]:
            image_bytes = _run_async(alibaba_client.download_bytes(image_url))
            ext = _guess_extension(image_url, fallback="png")
            filename = f"generated/{uuid.uuid4()}.{ext}"
            content_type = "image/png" if ext == "png" else "image/jpeg"
            storage_url = upload_to_oss(image_bytes, filename, content_type=content_type)
            _persist_media(
                user_id=user_id,
                media_type=MediaType.PHOTO,
                prompt=prompt,
                storage_url=storage_url,
                cost_usd=cost,
                model_used=selected_model,
                parent_media_id=parent_media_id,
            )
            storage_urls.append(storage_url)

        return {"storage_urls": storage_urls, "count": len(storage_urls)}

    except Exception as exc:
        logger.exception("Image generation failed: %s", exc)
        if _should_retry_generation_error(exc):
            raise self.retry(exc=exc, countdown=30)
        raise


@celery_app.task(bind=True, name="worker.tasks.generate_video_task", max_retries=3)
def generate_video_task(
    self,
    *,
    prompt: str,
    negative_prompt: str = "",
    reference_image_urls: Optional[list[str]] = None,
    user_id: str,
    template_id: Optional[str] = None,
    parent_media_id: Optional[str] = None,
) -> dict:
    """Generate a video via Alibaba Model Studio and upload to storage.

    Auto-selects wan2.7-t2v (text-to-video) or wan2.7-i2v (image-to-video)
    depending on whether reference images are provided.

    Returns a dict with ``storage_key`` and ``storage_url``.
    """
    try:
        has_refs = bool(reference_image_urls)
        selected_model = get_video_model(has_refs)
        cost = get_cost_usd(selected_model)

        from services.prompt_service import build_final_prompt, get_active_system_prompt, get_template_content

        with SessionLocal() as db:
            sys_prompt = get_active_system_prompt(db)
            tmpl_content = get_template_content(db, template_id) if template_id else None

        final_prompt = build_final_prompt(sys_prompt, tmpl_content, prompt)

        enriched_prompt = build_video_prompt(final_prompt)
        enriched_negative = build_negative_prompt(negative_prompt or None)

        resolved_refs = _resolve_reference_urls(reference_image_urls)
        ref_b64 = resolved_refs[0] if resolved_refs else None

        logger.info(
            "Submitting video generation: user=%s model=%s has_refs=%s",
            user_id, selected_model, has_refs,
        )
        response = _run_async(
            alibaba_client.generate_wan_video(
                prompt=enriched_prompt,
                model=selected_model,
                negative_prompt=enriched_negative,
                ref_image_b64=ref_b64,
            )
        )

        alibaba_task_id = response.get("output", {}).get("task_id")
        if not alibaba_task_id:
            raise ValueError(f"Unexpected Alibaba response: {response}")

        result = _poll_alibaba_task(alibaba_task_id)
        video_url = _extract_video_url(result)
        if not video_url:
            raise ValueError(f"No video URL found in Alibaba response: {result}")

        video_bytes = _run_async(alibaba_client.download_bytes(video_url, timeout=180))
        ext = _guess_extension(video_url, fallback="mp4")
        filename = f"generated/{uuid.uuid4()}.{ext}"
        storage_url = upload_to_oss(video_bytes, filename, content_type="video/mp4")
        _persist_media(
            user_id=user_id,
            media_type=MediaType.VIDEO,
            prompt=prompt,
            storage_url=storage_url,
            cost_usd=cost,
            model_used=selected_model,
            parent_media_id=parent_media_id,
        )

        return {"storage_url": storage_url}

    except Exception as exc:
        logger.exception("Video generation failed: %s", exc)
        if _should_retry_generation_error(exc):
            raise self.retry(exc=exc, countdown=60)
        raise


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _poll_alibaba_task(task_id: str, max_attempts: int = 60, interval: int = 5) -> dict:
    """Synchronously poll an Alibaba async task until it succeeds or fails."""
    import time

    for attempt in range(max_attempts):
        result = _run_async(alibaba_client.get_task_result(task_id))
        task_status = result.get("output", {}).get("task_status", "UNKNOWN")
        if task_status == "SUCCEEDED":
            return result
        if task_status in {"FAILED", "CANCELED"}:
            raise RuntimeError(f"Alibaba task {task_id} ended with status {task_status}")
        logger.debug("Polling Alibaba task %s (attempt %d): %s", task_id, attempt + 1, task_status)
        time.sleep(interval)
    raise TimeoutError(f"Alibaba task {task_id} did not complete within expected time")


def _extract_image_urls(payload: dict) -> list[str]:
    """Support both multimodal-generation and legacy output formats."""
    output = payload.get("output", {})
    urls: list[str] = []

    choices = output.get("choices", [])
    if choices:
        content = choices[0].get("message", {}).get("content", [])
        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                maybe_url = item.get("image") or item.get("image_url") or item.get("url")
                if isinstance(maybe_url, str) and maybe_url.startswith("http"):
                    urls.append(maybe_url)

    results = output.get("results", [])
    if isinstance(results, list):
        for item in results:
            if not isinstance(item, dict):
                continue
            maybe_url = item.get("url") or item.get("image_url") or item.get("image")
            if isinstance(maybe_url, str) and maybe_url.startswith("http"):
                urls.append(maybe_url)

    direct_url = output.get("image_url") or output.get("image")
    if isinstance(direct_url, str) and direct_url.startswith("http"):
        urls.append(direct_url)

    # Keep order but remove duplicates.
    deduped: list[str] = []
    seen: set[str] = set()
    for url in urls:
        if url not in seen:
            seen.add(url)
            deduped.append(url)
    return deduped


def _extract_video_url(payload: dict) -> str:
    """Extract video URL from known DashScope response shapes."""
    output = payload.get("output", {})

    direct = output.get("video_url")
    if isinstance(direct, str) and direct.startswith("http"):
        return direct

    results = output.get("results", [])
    if isinstance(results, list):
        for item in results:
            if not isinstance(item, dict):
                continue
            maybe_url = item.get("video_url") or item.get("url")
            if isinstance(maybe_url, str) and maybe_url.startswith("http"):
                return maybe_url

    return ""


def _guess_extension(url: str, fallback: str) -> str:
    """Guess extension from URL path. Falls back when missing/unusable."""
    suffix = Path(urlparse(url).path).suffix.lower().lstrip(".")
    if suffix and len(suffix) <= 5:
        return suffix
    return fallback


def _resolve_legacy_media_status(column_info: dict) -> str:
    """Pick a compatible value for legacy non-null media.status columns."""
    column_type = column_info.get("type")
    enum_values = getattr(column_type, "enums", None)
    if enum_values:
        for candidate in ("READY", "COMPLETED", "SUCCESS", "PROCESSED", "DONE"):
            if candidate in enum_values:
                return candidate
            if candidate.lower() in enum_values:
                return candidate.lower()
        return str(enum_values[0])
    return "READY"


def _persist_media(
    *,
    user_id: str,
    media_type: MediaType,
    prompt: str,
    storage_url: str,
    cost_usd: Optional[float] = None,
    model_used: Optional[str] = None,
    parent_media_id: Optional[str] = None,
) -> None:
    """Persist completed media records atomically."""
    db = SessionLocal()
    try:
        created_at = datetime.now(timezone.utc)
        table_metadata = MetaData()
        media_table = Table("media", table_metadata, autoload_with=db.bind)
        media_columns = {
            column["name"]: column
            for column in inspect(db.bind).get_columns("media")
        }

        insert_values = {
            "id": uuid.uuid4(),
            "user_id": uuid.UUID(str(user_id)),
            "media_type": media_type.value,
            "storage_url": storage_url,
            "created_at": created_at,
        }
        if "prompt" in media_columns:
            insert_values["prompt"] = prompt
        if "original_prompt" in media_columns:
            insert_values["original_prompt"] = prompt
        if "cost_usd" in media_columns and cost_usd is not None:
            insert_values["cost_usd"] = cost_usd
        if "model_used" in media_columns and model_used is not None:
            insert_values["model_used"] = model_used
        if "status" in media_columns:
            insert_values["status"] = _resolve_legacy_media_status(media_columns["status"])
        if "updated_at" in media_columns and not media_columns["updated_at"].get("nullable", True):
            insert_values["updated_at"] = created_at
        if "parent_media_id" in media_columns and parent_media_id is not None:
            insert_values["parent_media_id"] = uuid.UUID(str(parent_media_id))
        if "edit_count" in media_columns:
            insert_values["edit_count"] = 0

        db.execute(media_table.insert().values(**insert_values))
        db.commit()
    finally:
        db.close()
