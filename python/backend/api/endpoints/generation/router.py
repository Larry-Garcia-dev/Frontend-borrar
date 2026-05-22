from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.request_urls import absolute_base_url
from core.security import get_current_user
from core.database import get_db
from models.media import Media
from models.prompt import PromptTemplate
from models.user import User, UserRole
from models.custom_background import CustomBackground
from services.credit_service import validate_and_consume_credit
from services.storage import storage_client
from worker.tasks import generate_image_task, generate_video_task, generate_explicit_image_task, generate_implicit_image_task

router = APIRouter()

REFERENCE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
REFERENCE_IMAGE_MAX_BYTES = 15 * 1024 * 1024
REFERENCE_IMAGE_MAX_FILES = 8
# Longer TTL so Celery can fetch reference URLs after queue delay (S3 presigned).
REFERENCE_PRESIGN_EXPIRES = 86400


class GenerationRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    media_type: str = "image"
    reference_image_url: str = ""
    reference_image_urls: list[str] = Field(default_factory=list)
    num_images: int = 1
    model: str = "qwen-image-2.0-pro"
    template_id: Optional[str] = None
    parent_media_id: Optional[str] = None


class ExplicitGenerationRequest(BaseModel):
    """Request para generación de contenido explícito con imágenes."""
    background_b64: str  # Base64 de la imagen de fondo seleccionada
    pose_b64: str  # Base64 de la imagen de pose seleccionada
    reference_url: str  # URL de la foto de referencia de la modelo (ya está en servidor)
    reference_urls: list[str] = Field(default_factory=list)  # URLs o base64 de múltiples fotos de referencia
    additional_prompt: str = ""  # Instrucciones adicionales opcionales
    width: int = 1024
    height: int = 1024
    num_images: int = 3  # Cantidad de imágenes a generar (1-10)

class ImplicitGenerationRequest(BaseModel):
    """Request para generación de contenido implícito estructurado con separación de elementos."""
    prompt: str
    background_b64: Optional[str] = None
    clothing_b64: list[str] = Field(default_factory=list)
    objects_b64: list[str] = Field(default_factory=list)
    reference_urls: list[str] = Field(default_factory=list) # Por si envías un array vacío desde React
    width: int = 1024
    height: int = 1024
    num_images: int = 3
    
class ReferenceImagesResponse(BaseModel):
    urls: list[str]

class GenerationResponse(BaseModel):
    task_id: str
    status: str
    detail: str = ""


class CustomBackgroundResponse(BaseModel):
    id: str
    name: str
    storage_url: str
    studio_admin_id: str
    created_at: str


def _merge_reference_urls(single: str, many: list[str]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for raw in [*many, single]:
        url = (raw or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        ordered.append(url)
    return ordered


def _reference_extension(filename: str, content_type: Optional[str]) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix in REFERENCE_IMAGE_EXTENSIONS:
        return suffix.lstrip(".")
    if content_type == "image/png":
        return "png"
    if content_type in ("image/jpeg", "image/jpg"):
        return "jpg"
    if content_type == "image/webp":
        return "webp"
    return ""


@router.post("/reference-images", response_model=ReferenceImagesResponse)
async def upload_reference_images(
    request: Request,
    files: list[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    """Store reference images and return absolute URLs DashScope can fetch."""
    if not files:
        raise HTTPException(status_code=400, detail="Se requiere al menos un archivo.")
    if len(files) > REFERENCE_IMAGE_MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo {REFERENCE_IMAGE_MAX_FILES} imágenes de referencia.",
        )

    base = absolute_base_url(request)
    urls: list[str] = []

    for upload in files:
        ext = _reference_extension(upload.filename or "", upload.content_type)
        if not ext:
            raise HTTPException(
                status_code=400,
                detail="Formato no permitido. Usa PNG, JPG o WEBP.",
            )
        data = await upload.read()
        if len(data) > REFERENCE_IMAGE_MAX_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Cada imagen debe pesar como máximo {REFERENCE_IMAGE_MAX_BYTES // (1024 * 1024)} MB.",
            )
        key = storage_client.upload_bytes(data, extension=ext, folder="references")
        rel = storage_client.get_url(key, expires_in=REFERENCE_PRESIGN_EXPIRES)
        if rel.startswith("/"):
            urls.append(f"{base}{rel}")
        else:
            urls.append(rel)

    return ReferenceImagesResponse(urls=urls)


@router.get("/")
async def list_user_media(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the authenticated user's generated media gallery."""
    media_items = db.query(Media).filter(
        Media.user_id == current_user["id"]
    ).order_by(Media.created_at.desc()).all()
    
    return [
        {
            "id": str(m.id),
            "media_type": m.media_type.value,
            "prompt": m.original_prompt or m.legacy_prompt,
            "storage_url": m.storage_url or "",
            "status": "success",
            "created_at": m.created_at.isoformat() if m.created_at else "",
            "edit_count": m.edit_count or 0,
            "parent_media_id": str(m.parent_media_id) if m.parent_media_id else None,
            "is_approved": m.is_approved,
        }
        for m in media_items
    ]

@router.post("/", response_model=GenerationResponse)
async def create_generation(
    request: GenerationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, current_user["id"])
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    ref_urls = _merge_reference_urls(request.reference_image_url, request.reference_image_urls)

    # ── Edit-limit logic (Module D) ──────────────────────────────────────────
    # If editing an existing image, check how many edits have been used.
    # First 2 edits are free; starting from the 3rd, consume a credit.
    parent_media = None
    charge_credit = True  # default: always charge

    if request.parent_media_id:
        parent_media = db.get(Media, request.parent_media_id)
        if parent_media is None or str(parent_media.user_id) != str(current_user["id"]):
            raise HTTPException(status_code=404, detail="Imagen original no encontrada.")
        if parent_media.edit_count < 2:
            charge_credit = False  # free edit
        # Always increment edit_count on the parent
        parent_media.edit_count = (parent_media.edit_count or 0) + 1
        db.commit()

    if charge_credit:
        try:
            validate_and_consume_credit(user, db)
        except ValueError:
            raise HTTPException(
                status_code=429,
                detail="No tienes créditos disponibles.",
            )

    if request.media_type == "video":
        task = generate_video_task.delay(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            reference_image_urls=ref_urls or None,
            user_id=str(current_user["id"]),
            template_id=request.template_id,
            parent_media_id=request.parent_media_id,
        )
    else:
        actual_num_images = max(1, request.num_images)
        task = generate_image_task.delay(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            reference_image_urls=ref_urls or None,
            num_images=actual_num_images,
            user_id=str(current_user["id"]),
            template_id=request.template_id,
            parent_media_id=request.parent_media_id,
        )
    return GenerationResponse(task_id=task.id, status="queued", detail="Task encolado.")

@router.get("/prompt-templates")
async def list_active_templates(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return active prompt templates available to users during generation."""
    templates = (
        db.query(PromptTemplate)
        .filter(PromptTemplate.is_active == True)  # noqa: E712
        .order_by(PromptTemplate.sort_order.asc())
        .all()
    )
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "description": t.description,
        }
        for t in templates
    ]

@router.get("/{task_id}", response_model=GenerationResponse)
async def get_generation_status(task_id: str, current_user=Depends(get_current_user)):
    from worker.celery_app import celery_app
    result = celery_app.AsyncResult(task_id)
    return GenerationResponse(
        task_id=task_id,
        status=result.status.lower(),
        detail=_serialize_task_detail(result.info),
    )


def _serialize_task_detail(info: Any) -> str:
    """Convert Celery task metadata/errors to a small response-safe string."""
    if info is None:
        return ""
    if isinstance(info, BaseException):
        return str(info)
    if isinstance(info, dict):
        for key in ("message", "status", "error"):
            value = info.get(key)
            if isinstance(value, str) and value.strip():
                return value
        if "storage_url" in info:
            return "Generation completed."
        if "storage_urls" in info:
            return "Generation completed."
    return str(info)

@router.post("/explicit", response_model=GenerationResponse)
async def create_explicit_generation(
    request: ExplicitGenerationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Genera una imagen explícita usando 3 imágenes de referencia:
    - background_b64: Base64 del fondo seleccionado (piscina, cocina, etc.)
    - pose_b64: Base64 de la pose seleccionada
    - reference_url: URL de la foto de referencia de la modelo
    """
    from models.model_profile import ModelProfile
    from models.user import UserRole
    
    user = db.get(User, current_user["id"])
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    # Verificar que el usuario es modelo o estudio admin y tiene contenido explícito habilitado
    if user.role != UserRole.ESTUDIO_ADMIN and user.role != UserRole.MODELO:
        raise HTTPException(status_code=403, detail="Solo modelos pueden generar contenido explícito.")
    
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user.id).first()
    if user.role not in [UserRole.ESTUDIO_ADMIN, UserRole.MODELO]:
        raise HTTPException(status_code=403, detail="No tienes permisos para generar contenido explícito.")
    
    if user.role == UserRole.MODELO:
        profile = db.query(ModelProfile).filter(ModelProfile.user_id == user.id).first()
        if not profile or not profile.is_explicit:
            raise HTTPException(status_code=403, detail="Modelo no tiene habilitado el contenido explícito.")
        
#        if not profile or not profile.is_explicit:
#        raise HTTPException(status_code=403, detail="No tienes habilitado el contenido explícito.")
    
    # Consumir crédito
    try:
        validate_and_consume_credit(user, db)
    except ValueError:
        raise HTTPException(
            status_code=429,
            detail="No tienes créditos disponibles.",
        )
    
    # Encolar la tarea de generación explícita con base64 para fondo y pose
    actual_num_images = max(1, min(10, request.num_images))  # Limitar entre 1 y 10
    
    # Log de los datos recibidos
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[EXPLICIT] Received request: bg_b64_len={len(request.background_b64)}, pose_b64_len={len(request.pose_b64)}, ref_url={request.reference_url[:50] if request.reference_url else 'None'}, ref_urls_count={len(request.reference_urls)}, num_images={actual_num_images}")
    
    task = generate_explicit_image_task.delay(
        background_b64=request.background_b64,
        pose_b64=request.pose_b64,
        reference_url=request.reference_url,
        reference_urls=request.reference_urls,  # Pasar las URLs múltiples
        additional_prompt=request.additional_prompt,
        width=request.width,
        height=request.height,
        num_images=actual_num_images,
        user_id=str(current_user["id"]),
    )
    
    return GenerationResponse(task_id=task.id, status="queued", detail="Generación explícita encolada.")

@router.post("/implicit", response_model=GenerationResponse)
async def create_implicit_generation(
    request: ImplicitGenerationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Genera una imagen segura (implícita) separando estrictamente el fondo, 
    la ropa y los objetos para darle mejores instrucciones a la IA.
    """
    user = db.get(User, current_user["id"])
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    # Consumir crédito
    try:
        validate_and_consume_credit(user, db)
    except ValueError:
        raise HTTPException(
            status_code=429,
            detail="No tienes créditos disponibles.",
        )
    
    actual_num_images = max(1, min(10, request.num_images))
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(
        f"[IMPLICIT] Received request: bg_b64={'yes' if request.background_b64 else 'no'}, "
        f"clothing={len(request.clothing_b64)}, objects={len(request.objects_b64)}, num_images={actual_num_images}"
    )
    
    # Encolar la nueva tarea
    task = generate_implicit_image_task.delay(
        prompt=request.prompt,
        background_b64=request.background_b64,
        clothing_b64=request.clothing_b64,
        objects_b64=request.objects_b64,
        reference_urls=request.reference_urls,
        width=request.width,
        height=request.height,
        num_images=actual_num_images,
        user_id=str(current_user["id"]),
    )
    
    return GenerationResponse(task_id=task.id, status="queued", detail="Generación implícita encolada.")

@router.post("/{media_id}/approve")
async def approve_media(
    media_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models.report import ImageReport, ReportStatus
    import uuid
    from datetime import datetime, timezone
    
    media = db.get(Media, uuid.UUID(media_id))
    if not media or str(media.user_id) != str(current_user["id"]):
        raise HTTPException(status_code=404, detail="Media no encontrado")
    
    media.is_approved = True
    
    # Si había un reporte pendiente, lo marcamos como retirado (WITHDRAWN)
    pending_report = db.query(ImageReport).filter(
        ImageReport.media_id == media.id,
        ImageReport.status == ReportStatus.PENDING
    ).first()
    
    if pending_report:
        pending_report.status = ReportStatus.WITHDRAWN
        pending_report.reviewed_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"detail": "Media aprobado correctamente"}


# ============================================================================
# Custom Backgrounds Endpoints (solo para studio_admin)
# ============================================================================

BACKGROUND_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
BACKGROUND_MAX_BYTES = 10 * 1024 * 1024  # 10MB


@router.get("/custom-backgrounds", response_model=list[CustomBackgroundResponse])
async def list_custom_backgrounds(
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List custom backgrounds for the current studio admin."""
    user = db.get(User, current_user["id"])
    if not user or user.role != UserRole.ESTUDIO_ADMIN:
        raise HTTPException(status_code=403, detail="Solo studio admins pueden ver fondos personalizados.")
    
    backgrounds = (
        db.query(CustomBackground)
        .filter(CustomBackground.studio_admin_id == user.id)
        .order_by(CustomBackground.created_at.desc())
        .all()
    )
    
    base = absolute_base_url(request)
    
    return [
        CustomBackgroundResponse(
            id=str(bg.id),
            name=bg.name,
            storage_url=f"{base}{bg.storage_url}" if bg.storage_url.startswith("/") else bg.storage_url,
            studio_admin_id=str(bg.studio_admin_id),
            created_at=bg.created_at.isoformat() if bg.created_at else "",
        )
        for bg in backgrounds
    ]


@router.post("/custom-backgrounds", response_model=CustomBackgroundResponse)
async def upload_custom_background(
    request: Request,
    name: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a custom background for the current studio admin."""
    user = db.get(User, current_user["id"])
    if not user or user.role != UserRole.ESTUDIO_ADMIN:
        raise HTTPException(status_code=403, detail="Solo studio admins pueden subir fondos personalizados.")
    
    # Validate file extension
    ext = _reference_extension(file.filename or "", file.content_type)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa PNG, JPG o WEBP.",
        )
    
    # Read and validate file size
    data = await file.read()
    if len(data) > BACKGROUND_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"La imagen debe pesar como máximo {BACKGROUND_MAX_BYTES // (1024 * 1024)} MB.",
        )
    
    # Upload to storage
    key = storage_client.upload_bytes(data, extension=ext, folder="backgrounds")
    storage_url = storage_client.get_url(key, expires_in=86400 * 365)  # 1 year expiry
    
    # Create database record
    background = CustomBackground(
        name=name,
        storage_url=storage_url,
        studio_admin_id=user.id,
    )
    db.add(background)
    db.commit()
    db.refresh(background)
    
    base = absolute_base_url(request)
    
    return CustomBackgroundResponse(
        id=str(background.id),
        name=background.name,
        storage_url=f"{base}{background.storage_url}" if background.storage_url.startswith("/") else background.storage_url,
        studio_admin_id=str(background.studio_admin_id),
        created_at=background.created_at.isoformat() if background.created_at else "",
    )


@router.delete("/custom-backgrounds/{background_id}")
async def delete_custom_background(
    background_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a custom background."""
    import uuid as uuid_module
    
    user = db.get(User, current_user["id"])
    if not user or user.role != UserRole.ESTUDIO_ADMIN:
        raise HTTPException(status_code=403, detail="Solo studio admins pueden eliminar fondos.")
    
    try:
        bg_uuid = uuid_module.UUID(background_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de fondo inválido.")
    
    background = db.get(CustomBackground, bg_uuid)
    if not background or background.studio_admin_id != user.id:
        raise HTTPException(status_code=404, detail="Fondo no encontrado.")
    
    # Delete from storage if it's a local path
    if background.storage_url.startswith("/media/"):
        key = background.storage_url.replace("/media/", "")
        try:
            storage_client.delete(key)
        except Exception:
            pass  # Ignore storage deletion errors
    
    db.delete(background)
    db.commit()
    
    return {"detail": "Fondo eliminado correctamente."}

