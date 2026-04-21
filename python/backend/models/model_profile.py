"""Model Profile ORM model - stores model information and training photos."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class ModelProfileStatus(str, enum.Enum):
    """Status of a model profile."""
    PENDING = "PENDING"           # Waiting for approval
    APPROVED = "APPROVED"         # Approved and ready for AI training
    TRAINING = "TRAINING"         # AI is being trained
    READY = "READY"               # AI trained and ready to use
    REJECTED = "REJECTED"         # Rejected by admin
    SUSPENDED = "SUSPENDED"       # Temporarily suspended


class ModelProfile(Base):
    """Model profile with training photos and AI clone info."""

    __tablename__ = "model_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Link to the user (MODELO role)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        unique=True,  # One profile per user
    )
    
    # Link to studio (ESTUDIO role) that created this model
    studio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    
    # Basic info
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Physical characteristics for AI training
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ethnicity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hair_color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    eye_color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    height_cm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Training photos (URLs stored as JSON array)
    training_photos: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    # Example: ["url1", "url2", ...]
    
    # AI Training info
    ai_model_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    training_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    training_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    training_cost_usd: Mapped[Optional[float]] = mapped_column(Numeric(precision=10, scale=6), nullable=True)
    
    # Status
    status: Mapped[ModelProfileStatus] = mapped_column(
        String(20),
        nullable=False,
        default=ModelProfileStatus.PENDING,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Approval tracking
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Quota for this specific model
    images_per_order: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    studio: Mapped[Optional["User"]] = relationship("User", foreign_keys=[studio_id])


class ModelCreationRequest(Base):
    """Request from a studio to create a new model - requires approval and payment."""

    __tablename__ = "model_creation_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Studio making the request
    studio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    # Proposed model info
    model_email: Mapped[str] = mapped_column(String(320), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Training photos (URLs stored as JSON array)
    training_photos: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=list)
    
    # Physical characteristics
    model_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    # Example: {"age": 25, "gender": "female", "ethnicity": "latina", ...}
    
    # Status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    # PENDING, APPROVED, REJECTED, PAYMENT_PENDING, COMPLETED
    
    # Payment info
    payment_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    payment_amount_usd: Mapped[Optional[float]] = mapped_column(Numeric(precision=10, scale=2), nullable=True)
    payment_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    payment_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Approval/Rejection
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Result
    created_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=utcnow)
    
    # Relationships
    studio: Mapped["User"] = relationship("User", foreign_keys=[studio_id])
    created_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_user_id])
