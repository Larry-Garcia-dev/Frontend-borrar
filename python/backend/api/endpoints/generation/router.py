from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.request_urls import absolute_base_url
from core.security import get_current_user
from core.database import get_db
from models.media import Media
from models.prompt import PromptTemplate
from models.user import User
from services.credit_service import validate_and_consume_credit
from services.storage import storage_client
from worker.tasks import generate_image_task, generate_video_task

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


class ReferenceImagesResponse(BaseModel):
    urls: list[str]

class GenerationResponse(BaseModel):
    task_id: str
    status: str
    detail: str = ""


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
        task = generate_image_task.delay(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            reference_image_urls=ref_urls or None,
            num_images=max(1, request.num_images),
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
