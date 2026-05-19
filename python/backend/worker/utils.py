"""Funciones de utilidad compartidas para los workers de Celery."""

import asyncio
import base64
import io
import logging
import mimetypes
import uuid
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from typing import Optional

import httpx
from sqlalchemy import MetaData, Table, inspect
from sqlalchemy.exc import IntegrityError

from core.database import SessionLocal
from models.media import MediaType
from services.alibaba_api import alibaba_client
from services.storage import _BACKEND_DIR

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Ejecuta una rutina asíncrona dentro de una tarea síncrona de Celery."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _url_to_base64_data_uri(url: str) -> str:
    """Convierte una URL local a Data URI Base64 compatible con DashScope."""
    from PIL import Image

    DASHSCOPE_MAX_BYTES = 9 * 1024 * 1024
    MAX_DIMENSION = 1920

    parsed = urlparse(url)
    path = parsed.path
    if path.startswith("/media/"):
        relative_key = path[len("/media/"):]
    else:
        relative_key = path.lstrip("/")

    local_path = _BACKEND_DIR / "media" / relative_key
    if not local_path.exists():
        logger.warning("Reference image not found locally: %s", local_path)
        return url

    raw = local_path.read_bytes()

    if len(raw) <= DASHSCOPE_MAX_BYTES:
        mime, _ = mimetypes.guess_type(str(local_path))
        mime = mime or "image/jpeg"
        encoded = base64.b64encode(raw).decode("ascii")
        return f"data:{mime};base64,{encoded}"

    img = Image.open(io.BytesIO(raw)).convert("RGB")
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
            return f"data:image/jpeg;base64,{encoded}"
        quality -= 15

    w, h = img.size
    img = img.resize((w // 2, h // 2), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=60, optimize=True)
    data = buf.getvalue()
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def _resolve_reference_urls(urls: Optional[list[str]]) -> Optional[list[str]]:
    if not urls:
        return urls
    result = []
    for url in urls:
        parsed = urlparse(url)
        is_local = parsed.hostname in ("localhost", "127.0.0.1", "::1") or not parsed.scheme
        if is_local:
            result.append(_url_to_base64_data_uri(url))
        else:
            result.append(url)
    return result


def _should_retry_generation_error(exc: Exception) -> bool:
    if isinstance(exc, RuntimeError) or isinstance(exc, IntegrityError):
        return False
    if isinstance(exc, httpx.HTTPStatusError):
        if exc.response.status_code in {400, 401, 403, 404, 422}:
            return False
    return True


def _poll_alibaba_task(task_id: str, max_attempts: int = 60, interval: int = 5) -> dict:
    for attempt in range(max_attempts):
        result = _run_async(alibaba_client.get_task_result(task_id))
        task_status = result.get("output", {}).get("task_status", "UNKNOWN")
        if task_status == "SUCCEEDED":
            return result
        if task_status in {"FAILED", "CANCELED"}:
            raise RuntimeError(f"Alibaba task {task_id} ended with status {task_status}")
        time.sleep(interval)
    raise TimeoutError(f"Alibaba task {task_id} did not complete within expected time")


def _extract_image_urls(payload: dict) -> list[str]:
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

    deduped: list[str] = []
    seen: set[str] = set()
    for url in urls:
        if url not in seen:
            seen.add(url)
            deduped.append(url)
    return deduped


def _extract_video_url(payload: dict) -> str:
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
    suffix = Path(urlparse(url).path).suffix.lower().lstrip(".")
    if suffix and len(suffix) <= 5:
        return suffix
    return fallback


def _resolve_legacy_media_status(column_info: dict) -> str:
    column_type = column_info.get("type")
    enum_values = getattr(column_type, "enums", None)
    if enum_values:
        for candidate in ("READY", "COMPLETED", "SUCCESS", "PROCESSED", "DONE"):
            if candidate in enum_values or candidate.lower() in enum_values:
                return candidate.upper() if candidate in enum_values else candidate.lower()
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
    db = SessionLocal()
    try:
        created_at = datetime.now(timezone.utc)
        table_metadata = MetaData()
        media_table = Table("media", table_metadata, autoload_with=db.bind)
        media_columns = {column["name"]: column for column in inspect(db.bind).get_columns("media")}

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
            # 👇 --- AGREGA ESTAS DOS LÍNEAS AQUÍ --- 👇
        if "is_approved" in media_columns:
            insert_values["is_approved"] = False
        # 👆 ----------------------------------- 👆

        db.execute(media_table.insert().values(**insert_values))
        db.commit()
    finally:
        db.close()