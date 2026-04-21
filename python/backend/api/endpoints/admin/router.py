from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import get_db
from models.media import Media
from models.report import ImageReport, ReportStatus
from models.user import User, UserRole
from services.credit_service import assign_plan

router = APIRouter()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    daily_limit: int
    used_quota: int
    is_unlimited: bool
    vendor_id: Optional[UUID] = None


class UserUpdateRequest(BaseModel):
    daily_limit: Optional[int] = None
    role: Optional[str] = None
    is_unlimited: Optional[bool] = None


class UserCreateRequest(BaseModel):
    email: str
    role: Optional[str] = "CREATOR"
    daily_limit: Optional[int] = 10
    is_unlimited: Optional[bool] = False


def _serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        daily_limit=user.daily_limit,
        used_quota=user.used_quota,
        is_unlimited=bool(user.is_unlimited),
        vendor_id=user.vendor_id if hasattr(user, "vendor_id") else None,
    )


@router.get("/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Return aggregate stats for the admin dashboard."""
    total_users = db.execute(select(func.count()).select_from(User)).scalar() or 0
    total_media = db.execute(select(func.count()).select_from(Media)).scalar() or 0
    admin_count = db.execute(
        select(func.count()).select_from(User).where(User.role == UserRole.ADMIN)
    ).scalar() or 0
    total_cost_usd = db.execute(
        select(func.coalesce(func.sum(Media.cost_usd), 0.0))
    ).scalar() or 0.0
    return {
        "total_users": total_users,
        "total_media": total_media,
        "admin_count": admin_count,
        "total_cost_usd": float(total_cost_usd),
    }


@router.get("/users", response_model=list[UserResponse])
async def list_users(db: Session = Depends(get_db)) -> list[UserResponse]:
    """Return all users currently stored in the database."""
    users = db.execute(select(User).order_by(User.created_at.desc())).scalars().all()
    return [_serialize_user(user) for user in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreateRequest, db: Session = Depends(get_db)) -> UserResponse:
    """Create a new user manually from the admin panel."""
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    normalized_role = (payload.role or "CREATOR").strip().upper()
    if normalized_role not in UserRole.__members__:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="role must be ADMIN, CREATOR or VENDOR")

    user = User(
        email=payload.email,
        role=UserRole[normalized_role],
        daily_limit=payload.daily_limit if payload.daily_limit is not None else 10,
        is_unlimited=bool(payload.is_unlimited),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """Partially update user fields for admin panel editing."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.daily_limit is not None:
        if payload.daily_limit < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="daily_limit must be greater than or equal to 0",
            )
        assign_plan(user, db, payload.daily_limit)

    if payload.role is not None:
        normalized_role = payload.role.strip().upper()
        if normalized_role not in UserRole.__members__:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="role must be ADMIN, CREATOR or VENDOR",
            )
        user.role = UserRole[normalized_role]

    if payload.is_unlimited is not None:
        user.is_unlimited = payload.is_unlimited

    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    """Delete a user account and all their media."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()


@router.post("/users/{user_id}/reset-quota", response_model=UserResponse)
async def reset_user_quota(user_id: UUID, db: Session = Depends(get_db)) -> UserResponse:
    """Reset a user's daily used quota back to zero."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.used_quota = 0
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.get("/users-cost")
async def get_users_cost(db: Session = Depends(get_db)):
    """Return per-user total spend in USD, ordered by highest spend first."""
    rows = (
        db.execute(
            select(
                User.id,
                User.email,
                func.coalesce(func.sum(Media.cost_usd), 0.0).label("total_cost_usd"),
                func.count(Media.id).label("media_count"),
            )
            .outerjoin(Media, Media.user_id == User.id)
            .group_by(User.id, User.email)
            .order_by(func.coalesce(func.sum(Media.cost_usd), 0.0).desc())
        )
        .all()
    )
    return [
        {
            "user_id": str(row.id),
            "email": row.email,
            "total_cost_usd": float(row.total_cost_usd),
            "media_count": row.media_count,
        }
        for row in rows
    ]


@router.get("/users/{user_id}/media")
async def get_user_media(user_id: UUID, db: Session = Depends(get_db)):
    """Return all media generated by a specific user (admin view)."""
    items = db.query(Media).filter(Media.user_id == user_id).order_by(Media.created_at.desc()).all()
    return [
        {
            "id": str(m.id),
            "media_type": m.media_type.value,
            "prompt": m.original_prompt or m.legacy_prompt,
            "storage_url": m.storage_url or "",
            "created_at": m.created_at.isoformat() if m.created_at else "",
            "cost_usd": float(m.cost_usd) if m.cost_usd is not None else None,
            "model_used": m.model_used,
        }
        for m in items
    ]


# ── Image Reports (Module C) ─────────────────────────────────────────────────


class RejectReportRequest(BaseModel):
    admin_note: Optional[str] = None


@router.get("/reports")
async def list_pending_reports(db: Session = Depends(get_db)):
    """List all image reports with status PENDING."""
    reports = (
        db.query(ImageReport)
        .filter(ImageReport.status == ReportStatus.PENDING)
        .order_by(ImageReport.created_at.asc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "media_id": str(r.media_id),
            "user_id": str(r.user_id),
            "reason": r.reason,
            "status": r.status.value,
            "admin_note": r.admin_note,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        }
        for r in reports
    ]


@router.post("/reports/{report_id}/approve")
async def approve_report(report_id: UUID, db: Session = Depends(get_db)):
    """Approve a report and refund 1 credit to the user."""
    report = db.get(ImageReport, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    if report.status != ReportStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El reporte ya fue procesado con status '{report.status.value}'.",
        )

    report.status = ReportStatus.APPROVED
    report.reviewed_at = datetime.now(timezone.utc)

    # Refund 1 credit to the user
    user = db.get(User, report.user_id)
    if user and not user.is_unlimited and user.used_quota > 0:
        user.used_quota -= 1

    db.commit()
    return {"detail": "Reporte aprobado y crédito devuelto.", "report_id": str(report_id)}


@router.post("/reports/{report_id}/reject")
async def reject_report(
    report_id: UUID,
    payload: RejectReportRequest,
    db: Session = Depends(get_db),
):
    """Reject a report with an optional admin note."""
    report = db.get(ImageReport, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    if report.status != ReportStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El reporte ya fue procesado con status '{report.status.value}'.",
        )

    report.status = ReportStatus.REJECTED
    report.reviewed_at = datetime.now(timezone.utc)
    if payload.admin_note:
        report.admin_note = payload.admin_note.strip()

    db.commit()
    return {"detail": "Reporte rechazado.", "report_id": str(report_id)}
