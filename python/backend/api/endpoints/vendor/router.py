"""Vendor endpoints — manage users created by an ESTUDIO_ADMIN account."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User, UserRole
from services.credit_service import assign_plan

router = APIRouter()

class VendorUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    name: Optional[str] = None
    role: str
    daily_limit: int
    used_quota: int
    is_unlimited: bool
    quota_reset_at: Optional[str] = None

class VendorUserCreateRequest(BaseModel):
    email: str
    name: Optional[str] = None
    daily_limit: int = 100

class VendorUserUpdateRequest(BaseModel):
    daily_limit: int

def _require_vendor(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Return the studio User or raise 403."""
    user = db.get(User, current_user["id"])
    if user is None or user.role != UserRole.ESTUDIO_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilegios de Admin de Estudio requeridos.",
        )
    return user

def _serialize_vendor_user(user: User) -> VendorUserResponse:
    return VendorUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        daily_limit=user.daily_limit,
        used_quota=user.used_quota,
        is_unlimited=bool(user.is_unlimited),
        quota_reset_at=user.quota_reset_at.isoformat() if user.quota_reset_at else None,
    )

@router.get("/users", response_model=list[VendorUserResponse])
async def list_vendor_users(
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
) -> list[VendorUserResponse]:
    """List all models created by this studio."""
    users = (
        db.execute(
            select(User)
            .where(User.studio_id == vendor.id)
            .order_by(User.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [_serialize_vendor_user(u) for u in users]

@router.post("/users", response_model=VendorUserResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_user(
    payload: VendorUserCreateRequest,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
) -> VendorUserResponse:
    """Create a new MODELO user linked to this studio."""
    # 1. Verificar el límite de modelos del estudio
    current_models_count = db.execute(select(func.count()).select_from(User).where(User.studio_id == vendor.id)).scalar() or 0
    if current_models_count >= vendor.max_models_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Has alcanzado el límite de {vendor.max_models_limit} modelos permitidos para tu estudio."
        )

    # 2. Verificar que el correo no exista
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado.")

    user = User(
        email=payload.email,
        name=payload.name,
        role=UserRole.MODELO, # Forzado a ser modelo
        daily_limit=payload.daily_limit,
        studio_id=vendor.id,
        vendor_id=vendor.id, # Legacy fallback
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    assign_plan(user, db, payload.daily_limit)
    db.refresh(user)
    return _serialize_vendor_user(user)

@router.patch("/users/{user_id}", response_model=VendorUserResponse)
async def update_vendor_user(
    user_id: UUID,
    payload: VendorUserUpdateRequest,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
) -> VendorUserResponse:
    """Update daily_limit of a model owned by this studio."""
    user = db.get(User, user_id)
    if user is None or user.studio_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if payload.daily_limit < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="daily_limit debe ser mayor a 0.")
    
    # 3. VALIDAR LA EDICIÓN DE CRÉDITOS
    from models.model_profile import ModelCreationRequest, ModelProfile
    other_models_sum = db.execute(
        select(func.sum(User.daily_limit)).where(User.studio_id == vendor.id, User.id != user_id)
    ).scalar() or 0
    
    pending_requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.studio_id == vendor.id,
        ModelCreationRequest.status.in_(["PENDING", "PAYMENT_PENDING"])
    ).all()
    
    pending_sum = sum(int(r.model_info.get("assigned_daily_limit", 0)) if isinstance(r.model_info, dict) else 0 for r in pending_requests)
    
    total_requested = other_models_sum + pending_sum + payload.daily_limit
    if total_requested > vendor.daily_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Créditos insuficientes. Límite de estudio: {vendor.daily_limit}. Total asigando: {total_requested}."
        )

    assign_plan(user, db, payload.daily_limit)
    
    # Actualizar también el Perfil para que se vea reflejado en la UI
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user.id).first()
    if profile:
        profile.images_per_order = payload.daily_limit
        
    db.commit()
    db.refresh(user)
    return _serialize_vendor_user(user)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor_user(
    user_id: UUID,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
) -> None:
    """Delete a model owned by this studio."""
    user = db.get(User, user_id)
    if user is None or user.studio_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    db.delete(user)
    db.commit()