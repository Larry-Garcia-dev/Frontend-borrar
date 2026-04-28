"""Worker task para la generación de imágenes."""

import uuid
import logging
import random
from typing import Optional

from worker.celery_app import celery_app
from core.database import SessionLocal
from models.user import User, UserRole
from models.model_profile import ModelProfile
from models.media import MediaType

from services.alibaba_api import alibaba_client
from services.model_config import get_image_model, get_cost_usd
from services.prompt_engineer import build_image_prompt, build_negative_prompt
from services.storage import upload_to_oss
from services.prompt_service import build_final_prompt, get_active_system_prompt, get_template_content

from worker.utils import (
    _run_async,
    _resolve_reference_urls,
    _extract_image_urls,
    _poll_alibaba_task,
    _guess_extension,
    _persist_media,
    _should_retry_generation_error,
)

logger = logging.getLogger(__name__)


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
    
    try:
        with SessionLocal() as db:
            sys_prompt = get_active_system_prompt(db)
            tmpl_content = get_template_content(db, template_id) if template_id else None

            # === NUEVA LÓGICA: SELECCIÓN AUTOMÁTICA DE HASTA 3 FOTOS SI ES MODELO ===
            user = db.get(User, user_id)
            if user and user.role == UserRole.MODELO:
                profile = db.query(ModelProfile).filter(ModelProfile.user_id == user.id).first()
                if profile and profile.training_photos:
                    num_to_pick = min(3, len(profile.training_photos))
                    sampled_photos = random.sample(profile.training_photos, num_to_pick)
                    # Forzamos las imágenes de referencia para que el modelo haga Image2Image
                    reference_image_urls = sampled_photos

        final_prompt = build_final_prompt(sys_prompt, tmpl_content, prompt)
        enriched_prompt = build_image_prompt(final_prompt, style=style)
        enriched_negative = build_negative_prompt(negative_prompt or None)

        resolved_refs = _resolve_reference_urls(reference_image_urls)
        has_refs = bool(resolved_refs)
        selected_model = get_image_model(has_refs)
        cost = get_cost_usd(selected_model)

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
                ref_images_b64=resolved_refs, # AQUÍ PASAMOS LA LISTA DE IMÁGENES BASE64
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
            filename = f"generated/{user_id}/{uuid.uuid4()}.{ext}"
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