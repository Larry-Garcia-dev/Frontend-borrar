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
EXPLICIT_MASTER_PROMPT = """She creates completely nude images in different sexy, provocative poses.

{additional_instructions}
"""

EXPLICIT_NEGATIVE_PROMPT = """cartoon, anime, illustration, painting, drawing, sketch, 
low quality, blurry, pixelated, distorted, deformed, ugly, 
extra limbs, missing limbs, floating limbs, disconnected limbs,
extra fingers, missing fingers, fused fingers, too many fingers,
mutated hands, bad anatomy, bad proportions, disfigured,
watermark, text, signature, logo, banner,
oversaturated, overexposed, underexposed,
duplicate, clone, copy,garments, clothing, lingerie, shoes, stockings, t-shirts, thongs, bras, do not add legs"""


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
            "",  # 1. Sin variación
            " with slight angle variation",  # 2. Variación de ángulo
            " with subtle lighting variation",  # 3. Variación de luz
            " with warm tone variation",  # 4. Tonos cálidos
            " with cool tone variation",  # 5. Tonos fríos
            " with high contrast variation",  # 6. Alto contraste
            " with soft focus variation",  # 7. Enfoque suave
            " with dramatic shadow variation",  # 8. Sombras dramáticas
            " with bright highlight variation",  # 9. Brillos
            " with cinematic color grading",  # 10. Color cinematográfico
        ]
        
        actual_num = max(1, min(10, num_images))
        
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
            
            # Procesar la primera imagen de la respuesta con retry individual
            image_url = image_urls[0]
            image_bytes = None
            
            # Intentar descargar con retry individual (máx 3 intentos)
            for download_attempt in range(3):
                try:
                    image_bytes = _run_async(alibaba_client.download_bytes(image_url))
                    break  # Descarga exitosa
                except Exception as download_exc:
                    logger.warning(f"Download attempt {download_attempt + 1}/3 failed for image {i+1}: {download_exc}")
                    if download_attempt < 2:
                        import time
                        time.sleep(2)  # Esperar 2 segundos antes de reintentar
                    else:
                        logger.error(f"Failed to download image {i+1} after 3 attempts, skipping...")
                        continue
            
            if not image_bytes:
                logger.warning(f"Skipping image {i+1} due to download failure")
                continue
            
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

        # Si al menos generamos 1 imagen, consideramos éxito
        if storage_urls:
            logger.info(f"Successfully generated {len(storage_urls)}/{actual_num} images for user {user_id}")
            return {"storage_urls": storage_urls, "count": len(storage_urls)}
        else:
            raise ValueError("No images were generated successfully")

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
    reference_urls: Optional[list[str]] = None,  # Múltiples URLs o base64 de referencia
    additional_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    num_images: int = 3,
    user_id: str,
) -> dict:
    """
    Genera una imagen explícita usando imágenes de referencia:
    - background_b64: Base64 del fondo/escenario (ya convertido en frontend)
    - pose_b64: Base64 de la pose a replicar (ya convertido en frontend)
    - reference_url: URL de la foto de la modelo (se resuelve aquí)
    - reference_urls: Lista de URLs o base64 de múltiples fotos de referencia
    
    Utiliza un prompt maestro para instruir al modelo sobre cómo combinar las imágenes.
    """
    try:
        logger.info(
            "[EXPLICIT TASK] Starting: user=%s bg_b64_len=%d pose_b64_len=%d ref=%s ref_urls_count=%d",
            user_id, len(background_b64), len(pose_b64), 
            reference_url[:50] if reference_url else "None",
            len(reference_urls) if reference_urls else 0
        )
        
        # Construir el prompt final con instrucciones adicionales si las hay
        additional_instructions = ""
        if additional_prompt.strip():
            additional_instructions = f"ADDITIONAL INSTRUCTIONS FROM USER:\n{additional_prompt}"
        
        final_prompt = EXPLICIT_MASTER_PROMPT.format(additional_instructions=additional_instructions)
        
        # Resolver imágenes de referencia
        # 1. Si hay reference_urls (múltiples), usar esas
        # 2. Si no, usar reference_url (singular)
        all_reference_urls = reference_urls if reference_urls else [reference_url] if reference_url else []
        logger.info(f"[EXPLICIT TASK] Processing {len(all_reference_urls)} reference URLs/base64")
        
        # Filtrar URLs vacías
        all_reference_urls = [url for url in all_reference_urls if url and url.strip()]
        
        # Resolver las referencias (convertir URLs a base64 si es necesario)
        reference_b64_list = _resolve_reference_urls(all_reference_urls) if all_reference_urls else []
        logger.info(f"[EXPLICIT TASK] Resolved {len(reference_b64_list)} reference images to base64")
        
        # Combinar las imágenes en base64: background, pose, referencias
        resolved_refs = []
        
        # Agregar fondo si existe
        if background_b64 and background_b64.strip():
            resolved_refs.append(background_b64)
            logger.info(f"[EXPLICIT TASK] Added background (len={len(background_b64)})")
        
        # Agregar pose si existe
        if pose_b64 and pose_b64.strip():
            resolved_refs.append(pose_b64)
            logger.info(f"[EXPLICIT TASK] Added pose (len={len(pose_b64)})")
        
        # Agregar referencias
        for i, ref_b64 in enumerate(reference_b64_list):
            resolved_refs.append(ref_b64)
            logger.info(f"[EXPLICIT TASK] Added reference {i+1} (len={len(ref_b64)})")
        
        logger.info(f"[EXPLICIT TASK] Total images to send to Alibaba: {len(resolved_refs)}")
        
        if not resolved_refs:
            raise ValueError("No se encontraron imágenes de referencia para enviar")
        
        # Usar el modelo de Image2Image más potente
        selected_model = list(IMAGE2IMAGE_MODELS)[0] if IMAGE2IMAGE_MODELS else "wan2.7-image-pro"
        cost = get_cost_usd(selected_model)
        
        logger.info(
            "[EXPLICIT TASK] Submitting to Alibaba: user=%s model=%s ref_images=%d",
            user_id, selected_model, len(resolved_refs),
        )
        
        # Generar imágenes con variaciones sutiles para dar opciones al usuario
        storage_urls: list[str] = []
        num_images_to_generate = max(1, min(10, num_images))  # Usar el parámetro dinámico
        variations = [
            "",  # 1. Sin variación
            " with dramatic lighting and shadows",  # 2. Luz dramática
            " with softer ambient lighting",  # 3. Luz suave
            " with warm golden hour lighting",  # 4. Hora dorada
            " with cool blue tone lighting",  # 5. Tonos fríos
            " with high contrast studio lighting",  # 6. Alto contraste
            " with natural window lighting",  # 7. Luz de ventana
            " with moody low-key lighting",  # 8. Low-key
            " with bright high-key lighting",  # 9. High-key
            " with cinematic rim lighting",  # 10. Luz de borde cinematográfica
        ]
        
        for i in range(num_images_to_generate):
            # Agregar variación sutil al prompt para cada imagen
            variation_prompt = final_prompt
            if i > 0 and i < len(variations):
                variation_prompt = f"{final_prompt}\n\nLIGHTING STYLE: {variations[i]}"
            
            response = _run_async(
                alibaba_client.generate_wan_image(
                    prompt=variation_prompt,
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
                logger.warning(f"No image URL found for explicit variation {i+1}: {response}")
                continue
            
            # Descargar con retry individual
            image_url = image_urls[0]
            image_bytes = None
            
            for download_attempt in range(3):
                try:
                    image_bytes = _run_async(alibaba_client.download_bytes(image_url))
                    break
                except Exception as download_exc:
                    logger.warning(f"Download attempt {download_attempt + 1}/3 failed for explicit image {i+1}: {download_exc}")
                    if download_attempt < 2:
                        import time
                        time.sleep(2)
                    else:
                        logger.error(f"Failed to download explicit image {i+1} after 3 attempts, skipping...")
            
            if not image_bytes:
                logger.warning(f"Skipping explicit image {i+1} due to download failure")
                continue
            
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
            logger.info(f"Generated explicit image {i+1}/{num_images_to_generate} for user {user_id}")

        # Verificar que al menos se generó 1 imagen
        if not storage_urls:
            raise ValueError("No explicit images were generated successfully")
        
        logger.info("Explicit generation completed: user=%s urls=%d", user_id, len(storage_urls))
        return {"storage_urls": storage_urls, "count": len(storage_urls)}

    except Exception as exc:
        logger.exception("Explicit image generation failed: %s", exc)
        if _should_retry_generation_error(exc):
            raise self.retry(exc=exc, countdown=30)
        raise
    
@celery_app.task(bind=True, name="worker.tasks.generate_implicit_image_task", max_retries=3)
def generate_implicit_image_task(
    self,
    *,
    prompt: str,
    background_b64: Optional[str] = None,
    clothing_b64: Optional[list[str]] = None,
    objects_b64: Optional[list[str]] = None,
    reference_urls: Optional[list[str]] = None,
    width: int = 1024,
    height: int = 1024,
    num_images: int = 1,
    style: Optional[str] = None,
    user_id: str,
    template_id: Optional[str] = None,
    parent_media_id: Optional[str] = None,
) -> dict:
    """
    Genera una imagen segura (implícita) separando fondo, ropa, objetos y modelo.
    Instruye explícitamente a la IA sobre qué representa cada imagen de referencia.
    """
    try:
        with SessionLocal() as db:
            sys_prompt = get_active_system_prompt(db)
            tmpl_content = get_template_content(db, template_id) if template_id else None

            resolved_refs = []
            image_mapping_instructions = []

            # A. Fondo (Prioridad 1 para que la IA entienda el entorno)
            if background_b64 and background_b64.strip():
                resolved_refs.append(background_b64)
                image_mapping_instructions.append(
                    f"Image {len(resolved_refs)}: CRITICAL - This is the background environment setting. "
                    "The subject MUST be placed inside this exact environment."
                )

            # B. Fotos de la Modelo (El sujeto)
            user = db.get(User, user_id)
            if user and user.role == UserRole.MODELO:
                profile = db.query(ModelProfile).filter(ModelProfile.user_id == user.id).first()
                if profile and profile.training_photos:
                    num_to_pick = min(3, len(profile.training_photos))
                    sampled_photos = random.sample(profile.training_photos, num_to_pick)
                    model_b64_list = _resolve_reference_urls(sampled_photos)
                    for mb64 in model_b64_list:
                        resolved_refs.append(mb64)
                        image_mapping_instructions.append(f"Image {len(resolved_refs)}: The main character/subject.")
            
            # Si vienen reference_urls extra desde el front (opcional)
            if reference_urls:
                extra_refs = _resolve_reference_urls([u for u in reference_urls if u.strip()])
                for erb64 in extra_refs:
                    resolved_refs.append(erb64)
                    image_mapping_instructions.append(f"Image {len(resolved_refs)}: Additional character reference.")

            # C. Ropa
            if clothing_b64:
                for cb64 in clothing_b64:
                    if cb64.strip():
                        resolved_refs.append(cb64)
                        image_mapping_instructions.append(f"Image {len(resolved_refs)}: The specific clothing/outfit to be worn by the subject.")

            # D. Objetos
            if objects_b64:
                for ob64 in objects_b64:
                    if ob64.strip():
                        resolved_refs.append(ob64)
                        image_mapping_instructions.append(f"Image {len(resolved_refs)}: Specific objects to include in the scene.")

        # --- CONSTRUCCIÓN DEL PROMPT FINAL ---
        final_prompt = build_final_prompt(sys_prompt, tmpl_content, prompt)
        
        # Inyectar el mapeo de imágenes en el prompt para guiar a la IA
        if image_mapping_instructions:
            mapping_text = "\n".join(image_mapping_instructions)
            final_prompt = f"{final_prompt}\n\n=== REFERENCE IMAGE MAPPING ===\n{mapping_text}\n==============================="

        enriched_prompt = build_image_prompt(final_prompt, style=style)
        
        # Usamos un negative prompt seguro por defecto para esta tarea
        safe_negative = "nude, naked, nsfw, explicit, text, watermark, deformed, bad anatomy, ugly"
        enriched_negative = build_negative_prompt(safe_negative)

        has_refs = bool(resolved_refs)
        selected_model = get_image_model(has_refs)
        cost = get_cost_usd(selected_model)

        logger.info(
            "[IMPLICIT TASK] Submitting: user=%s model=%s total_refs=%d",
            user_id, selected_model, len(resolved_refs)
        )
        
        storage_urls: list[str] = []
        actual_num = max(1, min(10, num_images))
        
        # Variaciones para dar resultados distintos
        variations = [
            "", " with cinematic lighting", " with soft studio lighting", 
            " with natural sunlight", " with dramatic shadows", 
            " with warm color grading", " with cool tone grading"
        ]
        
        for i in range(actual_num):
            variation_prompt = enriched_prompt
            if i > 0 and i < len(variations):
                variation_prompt = f"{enriched_prompt}\nStyle note: {variations[i]}"
            
            response = _run_async(
                alibaba_client.generate_wan_image(
                    prompt=variation_prompt,
                    model=selected_model,
                    negative_prompt=enriched_negative,
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
                logger.warning(f"No image URL found for implicit variation {i+1}: {response}")
                continue
            
            image_url = image_urls[0]
            image_bytes = None
            
            # Descarga con reintentos
            for download_attempt in range(3):
                try:
                    image_bytes = _run_async(alibaba_client.download_bytes(image_url))
                    break
                except Exception as download_exc:
                    logger.warning(f"Download attempt {download_attempt + 1}/3 failed: {download_exc}")
                    if download_attempt < 2:
                        import time
                        time.sleep(2)
                    else:
                        logger.error(f"Failed to download implicit image {i+1}, skipping...")
            
            if not image_bytes:
                continue
            
            ext = _guess_extension(image_url, fallback="png")
            filename = f"generated/implicit/{user_id}/{uuid.uuid4()}.{ext}"
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
            logger.info(f"Generated implicit image {i+1}/{actual_num} for user {user_id}")

        if storage_urls:
            return {"storage_urls": storage_urls, "count": len(storage_urls)}
        else:
            raise ValueError("No implicit images were generated successfully")

    except Exception as exc:
        logger.exception("Implicit image generation failed: %s", exc)
        if _should_retry_generation_error(exc):
            raise self.retry(exc=exc, countdown=30)
        raise
