"""Notification ORM model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class NotificationType(str, enum.Enum):
    """Types of notifications."""
    REPORT_STATUS = "REPORT_STATUS"           # Report status changed
    REPORT_RESPONSE = "REPORT_RESPONSE"       # Admin responded to report
    PLAN_EXPIRING = "PLAN_EXPIRING"           # Plan about to expire
    PLAN_EXPIRED = "PLAN_EXPIRED"             # Plan has expired
    LOW_BALANCE = "LOW_BALANCE"               # Low image balance
    QUOTA_RESET = "QUOTA_RESET"               # Daily quota reset
    MODEL_APPROVED = "MODEL_APPROVED"         # Model creation approved
    MODEL_REJECTED = "MODEL_REJECTED"         # Model creation rejected
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED"     # Payment needed
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"     # Payment confirmed
    AI_TRAINING_COMPLETE = "AI_TRAINING_COMPLETE"  # AI model ready
    SYSTEM = "SYSTEM"                         # General system notification


class Notification(Base):
    """User notification."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    notification_type: Mapped[NotificationType] = mapped_column(
        String(30),
        nullable=False,
    )
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Optional link to related entity
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Additional data as JSON
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    # Status
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Email notification
    email_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    
    # Relationship
    user: Mapped["User"] = relationship(foreign_keys=[user_id], back_populates="notifications")
