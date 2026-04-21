"""Notifications API router."""

from datetime import datetime, timezone
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.notification import Notification, NotificationType
from models.user import User

router = APIRouter()


class NotificationResponse(BaseModel):
    """Notification response model."""
    id: str
    notification_type: str
    title: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    metadata: Optional[dict] = None
    is_read: bool
    read_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """List of notifications with pagination."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class CreateNotificationRequest(BaseModel):
    """Request to create a notification (admin only)."""
    user_id: str
    notification_type: str
    title: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    metadata: Optional[dict] = None


def _notification_to_response(notification: Notification) -> NotificationResponse:
    """Convert a notification to response format."""
    return NotificationResponse(
        id=str(notification.id),
        notification_type=notification.notification_type.value if hasattr(notification.notification_type, "value") else str(notification.notification_type),
        title=notification.title,
        message=notification.message,
        related_entity_type=notification.related_entity_type,
        related_entity_id=str(notification.related_entity_id) if notification.related_entity_id else None,
        metadata=notification.metadata,
        is_read=notification.is_read,
        read_at=notification.read_at.isoformat() if notification.read_at else None,
        created_at=notification.created_at.isoformat(),
    )


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notifications for the current user."""
    user_id = uuid.UUID(current_user["id"])
    
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return NotificationListResponse(
        notifications=[_notification_to_response(n) for n in notifications],
        total=total,
        unread_count=unread_count,
    )


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    user_id = uuid.UUID(current_user["id"])
    notification = db.query(Notification).filter(
        Notification.id == uuid.UUID(notification_id),
        Notification.user_id == user_id,
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")
    
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Notificacion marcada como leida"}


@router.post("/read-all")
async def mark_all_as_read(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    user_id = uuid.UUID(current_user["id"])
    
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })
    db.commit()
    
    return {"message": "Todas las notificaciones marcadas como leidas"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a notification."""
    user_id = uuid.UUID(current_user["id"])
    notification = db.query(Notification).filter(
        Notification.id == uuid.UUID(notification_id),
        Notification.user_id == user_id,
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notificacion eliminada"}


# --- Admin endpoints ---

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: CreateNotificationRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a notification to a user (admin only)."""
    admin = db.get(User, uuid.UUID(current_user["id"]))
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Solo administradores pueden enviar notificaciones")
    
    try:
        notification_type = NotificationType(data.notification_type)
    except ValueError:
        notification_type = NotificationType.SYSTEM
    
    notification = Notification(
        user_id=uuid.UUID(data.user_id),
        notification_type=notification_type,
        title=data.title,
        message=data.message,
        related_entity_type=data.related_entity_type,
        related_entity_id=uuid.UUID(data.related_entity_id) if data.related_entity_id else None,
        metadata=data.metadata,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return _notification_to_response(notification)


# --- Helper function to create notifications from other modules ---

def create_notification(
    db: Session,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    title: str,
    message: str,
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None,
) -> Notification:
    """Create a notification for a user."""
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        metadata=metadata,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
