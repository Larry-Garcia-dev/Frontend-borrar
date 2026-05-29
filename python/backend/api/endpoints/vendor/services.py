from __future__ import annotations
import uuid
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from models.user import User, UserRole
from models.model_profile import ModelCreationRequest, ModelProfile
from api.endpoints.vendor.schemas import VendorUserResponse, VendorUserCreateRequest, VendorUserUpdateRequest

def serialize_vendor_user(user: User) -> VendorUserResponse:
    """Convierte un modelo SQLAlchemy User en un esquema de respuesta."""
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

def get_vendor_users_service(db: Session, vendor_id: uuid.UUID) -> List[VendorUserResponse]:
    """Lista todas las modelos vinculadas al estudio."""
    users = (
        db.execute(
            select(User)
            .where(User.studio_id == vendor_id)
            .order_by(User.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [serialize_vendor_user(u) for u in users]

def create_vendor_user_service(db: Session, vendor: User, payload: VendorUserCreateRequest) -> VendorUserResponse:
    """Crea una nueva cuenta de modelo validando los límites del estudio."""
    # 1. Verificar el límite de modelos del estudio
    current_models_count = db.execute(
        select(func.count()).select_from(User).where(User.studio_id == vendor.id)
    ).scalar() or 0
    
    if current_models_count >= vendor.max_models_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Has alcanzado el límite de {vendor.max_models_limit} modelos permitidos."
        )

    # 2. Verificar duplicados
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado.")

    user = User(
        email=payload.email,
        name=payload.name,
        role=UserRole.MODELO,
        daily_limit=payload.daily_limit,
        studio_id=vendor.id,
        vendor_id=vendor.id,
        used_quota=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize_vendor_user(user)

def update_vendor_user_service(db: Session, vendor_id: uuid.UUID, user_id: uuid.UUID, payload: VendorUserUpdateRequest) -> VendorUserResponse:
    """Actualiza la cuota de una modelo validando los créditos disponibles del estudio."""
    user = db.get(User, user_id)
    if user is None or user.studio_id != vendor_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    
    if payload.daily_limit < user.used_quota:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No puedes reducir la cuota por debajo de los créditos ya consumidos ({user.used_quota})."
        )
    
    # Validar contra el balance total del estudio
    vendor = db.get(User, vendor_id)
    other_models_sum = db.execute(
        select(func.sum(User.daily_limit)).where(User.studio_id == vendor_id, User.id != user_id)
    ).scalar() or 0
    
    pending_requests = db.query(ModelCreationRequest).filter(
        ModelCreationRequest.studio_id == vendor_id,
        ModelCreationRequest.status.in_(["PENDING", "PAYMENT_PENDING"])
    ).all()
    
    pending_sum = sum(int(r.model_info.get("assigned_daily_limit", 0)) if isinstance(r.model_info, dict) else 0 for r in pending_requests)
    
    if (other_models_sum + pending_sum + payload.daily_limit) > vendor.daily_limit:
        raise HTTPException(
            status_code=400,
            detail="Créditos insuficientes en el balance del estudio."
        )

    user.daily_limit = payload.daily_limit
    
    # Sincronizar perfil
    profile = db.query(ModelProfile).filter(ModelProfile.user_id == user.id).first()
    if profile:
        profile.images_per_order = payload.daily_limit
        
    db.commit()
    db.refresh(user)
    return serialize_vendor_user(user)

def delete_vendor_user_service(db: Session, vendor: User, user_id: uuid.UUID) -> None:
    """Elimina una modelo y ajusta el balance del estudio restando lo ya consumido."""
    user = db.get(User, user_id)
    if user is None or user.studio_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        
    # Lógica de protección de créditos: se resta lo consumido al balance total del estudio
    if user.used_quota > 0:
        vendor.daily_limit = max(0, vendor.daily_limit - user.used_quota)
        db.add(vendor)
        
    db.delete(user)
    db.commit()