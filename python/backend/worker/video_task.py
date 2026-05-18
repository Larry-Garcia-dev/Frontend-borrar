"""Worker task para la generación de videos."""

import uuid
import logging
from typing import Optional

from worker.celery_app import celery_app
from core.database import SessionLocal
from models.media import MediaType

from services.alibaba_api import alibaba_client
from services.model_config import get_video_model, get_cost_usd
from services.prompt_engineer import build_video_prompt, build_negative_prompt
from services.storage import upload_to_oss
from services.prompt_service import build_final_prompt, get_active_system_prompt, get_template_content

from worker.utils import (
    _run_async,
    _resolve_reference_urls,
    _extract_video_url,
    _poll_alibaba_task,
    _guess_extension,
    _persist_media,
    _should_retry_generation_error,
)

logger = logging.getLogger(__name__)


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
    
    try:
        has_refs = bool(reference_image_urls)
        selected_model = get_video_model(has_refs)
        cost = get_cost_usd(selected_model)

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