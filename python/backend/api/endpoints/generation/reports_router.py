"""User-facing report endpoints: submit quality complaints for generated images."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.media import Media
from models.report import ImageReport, ReportStatus
from models.user import User, UserRole
from models.notification import NotificationType
from api.endpoints.notifications.router import create_notification

router = APIRouter()


class ReportRequest(BaseModel):
    reason: str


class ReportResponse(BaseModel):
    id: str
    media_id: str
    reason: str
    status: str
    created_at: str


@router.post(
    "/{media_id}/report",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    media_id: str,
    payload: ReportRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse:
    """Submit a quality complaint for a generated image."""
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El motivo del reporte no puede estar vacío.",
        )

    try:
        media_uuid = uuid.UUID(str(media_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagen no encontrada.")

    media = db.get(Media, media_uuid)
    if media is None or str(media.user_id) != str(current_user["id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagen no encontrada.")

    existing = (
        db.query(ImageReport)
        .filter(
            ImageReport.media_id == media_uuid,
            ImageReport.user_id == current_user["id"],
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un reporte para esta imagen.",
        )

    report = ImageReport(
        media_id=media_uuid,
        user_id=current_user["id"],
        reason=payload.reason.strip(),
        status=ReportStatus.PENDING,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # --- NUEVO: Enviar Notificación al Admin Macondo ---
    admins = db.query(User).filter(User.role == UserRole.MACONDO_ADMIN).all()
    for admin in admins:
        create_notification(
            db, admin.id, NotificationType.REPORT_STATUS,
            "Nueva imagen reportada",
            f"Una modelo ha reportado una imagen generada por problemas de calidad.",
            related_entity_type="REPORT",
            related_entity_id=report.id,
        )

    return ReportResponse(
        id=str(report.id),
        media_id=str(report.media_id),
        reason=report.reason,
        status=report.status.value,
        created_at=report.created_at.isoformat(),
    )