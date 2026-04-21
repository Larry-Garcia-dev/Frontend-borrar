"""Billing ORM models for tracking costs and payments."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class BillingRecordType(str, enum.Enum):
    """Types of billing records."""
    IMAGE_GENERATION = "IMAGE_GENERATION"     # Cost of generating an image
    AI_TRAINING = "AI_TRAINING"               # Cost of training AI model
    MODEL_CREATION = "MODEL_CREATION"         # Fee for creating a new model
    SUBSCRIPTION = "SUBSCRIPTION"             # Monthly/yearly subscription
    PAYMENT = "PAYMENT"                       # Payment received
    ADJUSTMENT = "ADJUSTMENT"                 # Manual adjustment
    REFUND = "REFUND"                         # Refund given


class BillingRecord(Base):
    """Individual billing record for tracking costs and payments."""

    __tablename__ = "billing_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # User this record belongs to
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    # If user is a model, also track the studio
    studio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    
    record_type: Mapped[BillingRecordType] = mapped_column(
        String(30),
        nullable=False,
    )
    
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Amounts (positive = cost/charge, negative = payment/credit)
    amount_usd: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=4),
        nullable=False,
        default=0,
    )
    
    # For image generation, link to the media
    media_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Additional extra data
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    # Example: {"model_used": "wan2.6-image", "prompt_tokens": 100}
    
    # Who created this record (for manual adjustments)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[user_id],
        back_populates="billing_records"
    )
    studio: Mapped[Optional["User"]] = relationship("User", foreign_keys=[studio_id])
    media: Mapped[Optional["Media"]] = relationship("Media")


class UserBalance(Base):
    """Cached balance for a user (studio or model)."""

    __tablename__ = "user_balances"

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
        unique=True,
    )
    
    # Current balance (negative = owes money, positive = has credit)
    balance_usd: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=4),
        nullable=False,
        default=0,
    )
    
    # Total costs incurred
    total_costs_usd: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=4),
        nullable=False,
        default=0,
    )
    
    # Total payments received
    total_payments_usd: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=4),
        nullable=False,
        default=0,
    )
    
    # Stats
    total_images_generated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_ai_trainings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    
    # Relationship
    user: Mapped["User"] = relationship("User")


class ActivityLog(Base):
    """Comprehensive activity log for all platform actions."""

    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Who performed the action
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    
    # Action details
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Examples: "LOGIN", "IMAGE_GENERATED", "PROMPT_CHANGED", "USER_CREATED", etc.
    
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Examples: "USER", "MEDIA", "PROMPT_TEMPLATE", "REPORT"
    
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Before/after for changes
    old_value: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Additional context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    
    # Relationship
    user: Mapped[Optional["User"]] = relationship("User")
