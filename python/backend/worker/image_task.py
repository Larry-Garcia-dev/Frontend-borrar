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
from services.model_config import get_image_model, get_cost_usd, IMAGE2IMAGE_MODELS
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


# ============================================================================
# PROMPT MAESTRO PARA GENERACIÓN EXPLÍCITA
# ============================================================================
EXPLICIT_MASTER_PROMPT = """You are an expert AI image generator specialized in creating high-quality, professional adult content photography.

You will receive 3 reference images:
1. BACKGROUND IMAGE: This is the environment/setting where the final image should take place. Use this as the background scene.
2. POSE IMAGE: This shows the body position and pose that the subject should adopt. Replicate this pose exactly.
3. MODEL REFERENCE IMAGE: This is the model/subject. Match their face, body type, skin tone, and physical characteristics precisely.

YOUR TASK:
Generate a photorealistic image that:
- Places the MODEL (from image 3) in the exact POSE (from image 2) within the BACKGROUND/SETTING (from image 1)
- Maintains photorealistic quality with professional lighting
- Preserves the model's facial features, body proportions, and skin characteristics
- Creates a seamless, natural composition as if the photo was taken on location
- Uses dramatic, flattering lighting appropriate for the scene

STYLE REQUIREMENTS:
- Professional photography quality
- Natural skin textures and tones
- Realistic shadows and highlights
- High resolution details
- Cinematic composition

{additional_instructions}
"""

EXPLICIT_NEGATIVE_PROMPT = """cartoon, anime, illustration, painting, drawing, sketch, 
low quality, blurry, pixelated, distorted, deformed, ugly, 
extra limbs, missing limbs, floating limbs, disconnected limbs,
extra fingers, missing fingers, fused fingers, too many fingers,
mutated hands, bad anatomy, bad proportions, disfigured,
watermark, text, signature, logo, banner,
oversaturated, overexposed, underexposed,
duplicate, clone, copy"""


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
        
        # Si se solicitan múltiples imágenes, generamos cada una por separado
        # para garantizar variación (agregamos variación al prompt)
        storage_urls: list[str] = []
        variations = [
            "",  # Primera imagen sin variación
            " with slight angle variation",  # Segunda con variación de ángulo
            " with subtle lighting variation",  # Tercera con variación de luz
        ]
        
        actual_num = max(1, num_images)
        
        for i in range(actual_num):
            # Agregar variación sutil al prompt para cada imagen
            variation_prompt = enriched_prompt
            if i > 0 and i < len(variations):
                variation_prompt = f"{enriched_prompt}{variations[i]}"
            
            response = _run_async(
                alibaba_client.generate_wan_image(
                    prompt=variation_prompt,
                    model=selected_model,
                    negative_prompt=enriched_negative,
                    width=width,
                    height=height,
                    ref_images_b64=resolved_refs,
                    n=1,  # Generamos 1 imagen a la vez para garantizar variación
                )
            )

            image_urls = _extract_image_urls(response)
            alibaba_task_id = response.get("output", {}).get("task_id")
            
            if not image_urls and alibaba_task_id:
                result = _poll_alibaba_task(alibaba_task_id)
                image_urls = _extract_image_urls(result)

            if not image_urls:
                logger.warning(f"No image URL found for variation {i}: {response}")
                continue
            
            # Procesar la primera imagen de la respuesta
            image_url = image_urls[0]
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
            
            logger.info(f"Generated image {i+1}/{actual_num} for user {user_id}")

        return {"storage_urls": storage_urls, "count": len(storage_urls)}

    except Exception as exc:
        logger.exception("Image generation failed: %s", exc)
        if _should_retry_generation_error(exc):
            raise self.retry(exc=exc, countdown=30)
        raise


@celery_app.task(bind=True, name="worker.tasks.generate_explicit_image_task", max_retries=3)
def generate_explicit_image_task(
    self,
    *,
    background_b64: str,
    pose_b64: str,
    reference_url: str,
    additional_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    user_id: str,
) -> dict:
    """
    Genera una imagen explícita usando 3 imágenes de referencia:
    - background_b64: Base64 del fondo/escenario (ya convertido en frontend)
    - pose_b64: Base64 de la pose a replicar (ya convertido en frontend)
    - reference_url: URL de la foto de la modelo (se resuelve aquí)
    
    Utiliza un prompt maestro para instruir al modelo sobre cómo combinar las 3 imágenes.
    """
    try:
        logger.info(
            "Starting explicit image generation: user=%s bg_b64_len=%d pose_b64_len=%d ref=%s",
            user_id, len(background_b64), len(pose_b64), reference_url[:50]
        )
        
        # Construir el prompt final con instrucciones adicionales si las hay
        additional_instructions = ""
        if additional_prompt.strip():
            additional_instructions = f"ADDITIONAL INSTRUCTIONS FROM USER:\n{additional_prompt}"
        
        final_prompt = EXPLICIT_MASTER_PROMPT.format(additional_instructions=additional_instructions)
        
        # Fondo y pose ya vienen en base64, solo resolver la URL de referencia
        reference_b64_list = _resolve_reference_urls([reference_url])
        
        if not reference_b64_list:
            raise ValueError("No se pudo resolver la imagen de referencia de la modelo")
        
        # Combinar las 3 imágenes en base64: background, pose, reference
        resolved_refs = [background_b64, pose_b64, reference_b64_list[0]]
        
        # Usar el modelo de Image2Image más potente
        selected_model = list(IMAGE2IMAGE_MODELS)[0] if IMAGE2IMAGE_MODELS else "wan2.7-image-pro"
        cost = get_cost_usd(selected_model)
        
        logger.info(
            "Submitting explicit generation: user=%s model=%s images=%d",
            user_id, selected_model, len(resolved_refs),
        )
        
        response = _run_async(
            alibaba_client.generate_wan_image(
                prompt=final_prompt,
                model=selected_model,
                negative_prompt=EXPLICIT_NEGATIVE_PROMPT,
                width=width,
                height=height,
                ref_images_b64=resolved_refs,
                n=1,
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
        for image_url in image_urls[:1]:  # Solo generamos 1 imagen
            image_bytes = _run_async(alibaba_client.download_bytes(image_url))
            ext = _guess_extension(image_url, fallback="png")
            filename = f"generated/explicit/{user_id}/{uuid.uuid4()}.{ext}"
            content_type = "image/png" if ext == "png" else "image/jpeg"
            
            storage_url = upload_to_oss(image_bytes, filename, content_type=content_type)
            
            _persist_media(
                user_id=user_id,
                media_type=MediaType.PHOTO,
                prompt=f"[EXPLICIT] {additional_prompt}" if additional_prompt else "[EXPLICIT] Generated content",
                storage_url=storage_url,
                cost_usd=cost,
                model_used=selected_model,
                parent_media_id=None,
            )
            storage_urls.append(storage_url)

        logger.info("Explicit generation completed: user=%s urls=%d", user_id, len(storage_urls))
        return {"storage_urls": storage_urls, "count": len(storage_urls)}

    except Exception as exc:
        logger.exception("Explicit image generation failed: %s", exc)
        if _should_retry_generation_error(exc):
            raise self.retry(exc=exc, countdown=30)
        raise
