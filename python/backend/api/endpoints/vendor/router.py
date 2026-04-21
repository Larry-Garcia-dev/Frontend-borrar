"""Vendor endpoints — manage users created by a vendor account."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User, UserRole
from services.credit_service import assign_plan

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class VendorUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_vendor(current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Return the vendor User or raise 403."""
    user = db.get(User, current_user["id"])
    if user is None or user.role != UserRole.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor privileges required.",
        )
    return user


def _serialize_vendor_user(user: User) -> VendorUserResponse:
    return VendorUserResponse(
        id=user.id,
        email=user.email,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        daily_limit=user.daily_limit,
        used_quota=user.used_quota,
        is_unlimited=bool(user.is_unlimited),
        quota_reset_at=user.quota_reset_at.isoformat() if user.quota_reset_at else None,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[VendorUserResponse])
async def list_vendor_users(
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
) -> list[VendorUserResponse]:
    """List all users created by this vendor."""
    users = (
        db.execute(
            select(User)
            .where(User.vendor_id == vendor.id)
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
    """Create a new CREATOR user linked to this vendor."""
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = User(
        email=payload.email,
        role=UserRole.CREATOR,
        daily_limit=payload.daily_limit,
        vendor_id=vendor.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Assign plan sets quota_reset_at
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
    """Update daily_limit of a user owned by this vendor."""
    user = db.get(User, user_id)
    if user is None or user.vendor_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if payload.daily_limit < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="daily_limit must be >= 0.",
        )
    assign_plan(user, db, payload.daily_limit)
    db.refresh(user)
    return _serialize_vendor_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor_user(
    user_id: UUID,
    vendor: User = Depends(_require_vendor),
    db: Session = Depends(get_db),
) -> None:
    """Delete a user owned by this vendor."""
    user = db.get(User, user_id)
    if user is None or user.vendor_id != vendor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    db.delete(user)
    db.commit()
