"""Model Profiles API router - manages model creation and profiles."""

from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user

# Rutas de subida de archivos (Upload)
from api.endpoints.models.upload import router as upload_router

# Schemas
from api.endpoints.models.schemas import (
    CreateModelRequest,
    ModelInfoRequest,
    ModelProfileResponse,
    ModelCreationRequestResponse
)

# Services
from api.endpoints.models.services import (
    create_model_request,
    get_studio_requests,
    get_studio_models,
    get_my_profile,
    update_my_profile,
    get_all_pending_requests,
    approve_model_request_service,
    reject_model_request_service,
    confirm_payment_service,
    get_all_model_profiles,
    toggle_model_status_service  # <--- IMPORTACIÓN AÑADIDA AQUÍ
)

router = APIRouter()

# Incluir ruta de fotos
router.include_router(upload_router)

# --- Studio endpoints ---

@router.post("/request-creation", response_model=ModelCreationRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_model_creation(
    data: CreateModelRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_model_request(db, current_user["id"], data)

@router.get("/my-requests", response_model=List[ModelCreationRequestResponse])
async def get_my_model_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_studio_requests(db, current_user["id"])

@router.get("/my-models", response_model=List[ModelProfileResponse])
async def get_my_models(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_studio_models(db, current_user["id"])

# --- Model's own profile ---

@router.get("/my-profile", response_model=ModelProfileResponse)
async def get_my_model_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_my_profile(db, current_user["id"])

@router.put("/my-profile", response_model=ModelProfileResponse)
async def update_model_profile(
    data: ModelInfoRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_my_profile(db, current_user["id"], data)

# --- Admin endpoints ---

@router.get("/pending-requests", response_model=List[ModelCreationRequestResponse])
async def get_pending_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_all_pending_requests(db, current_user["id"])

@router.post("/requests/{request_id}/approve")
async def approve_model_request(
    request_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return approve_model_request_service(db, current_user["id"], request_id)

@router.post("/requests/{request_id}/reject")
async def reject_model_request(
    request_id: str,
    reason: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return reject_model_request_service(db, current_user["id"], request_id, reason)

@router.post("/requests/{request_id}/confirm-payment")
async def confirm_payment(
    request_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return confirm_payment_service(db, current_user["id"], request_id)

@router.get("/all-profiles", response_model=List[ModelProfileResponse])
async def get_all_profiles(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_all_model_profiles(db, current_user["id"], skip, limit, status_filter)

@router.post("/profiles/{profile_id}/toggle-status", response_model=ModelProfileResponse)
async def toggle_model_status(
    profile_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pausa o Activa a una modelo."""
    return toggle_model_status_service(db, current_user["id"], profile_id)