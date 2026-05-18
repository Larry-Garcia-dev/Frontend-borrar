"""Vendor endpoints router — routes only."""

from __future__ import annotations
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User, UserRole
from api.endpoints.vendor.schemas import VendorUserResponse, VendorUserCreateRequest, VendorUserUpdateRequest
from api.endpoints.vendor.services import (
    get_vendor_users_service,
    create_vendor_user_service,
    update_vendor_user_service,
    delete_vendor_user_service
)

router = APIRouter()

def _require_vendor(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Dependencia para asegurar que el usuario es un Admin de Estudio."""
    user = db.get(User, UUID(current_user["id"]))
    if user is None or user.role != UserRole.ESTUDIO_ADMIN:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilegios de Admin de Estudio requeridos.",
        )
    return user

@router.get("/users", response_model=list[VendorUserResponse])
async def list_vendor_users(
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
):
    return get_vendor_users_service(db, vendor.id)

@router.post("/users", response_model=VendorUserResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_user(
    payload: VendorUserCreateRequest,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
):
    return create_vendor_user_service(db, vendor, payload)

@router.patch("/users/{user_id}", response_model=VendorUserResponse)
async def update_vendor_user(
    user_id: UUID,
    payload: VendorUserUpdateRequest,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
):
    return update_vendor_user_service(db, vendor.id, user_id, payload)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor_user(
    user_id: UUID,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
):
    return delete_vendor_user_service(db, vendor, user_id)