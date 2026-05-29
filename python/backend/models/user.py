"""User ORM model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    """Authorization role for a user.
    
    Hierarchy:
    - MACONDO_ADMIN: Super admin, can create studios, set their limits, manage billing and global reports.
    - ESTUDIO_ADMIN: Studio admin, can create/manage their models up to max_models_limit, and manage their photos.
    - MODELO: Model/Creator, linked to an ESTUDIO_ADMIN, can only generate photos and submit reports.
    """
    MACONDO_ADMIN = "MACONDO_ADMIN"
    ESTUDIO_ADMIN = "ESTUDIO_ADMIN"
    MODELO = "MODELO"


class UserType(str, enum.Enum):
    """Type of model user for billing/features."""
    STUDIO_MODEL = "STUDIO_MODEL"      # Model belongs to a studio
    INDEPENDENT_MODEL = "INDEPENDENT_MODEL"  # Independent model (optional for future use)


class User(Base):
    """Application user entity."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    
    # Authentication
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Profile info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    
    # Role and type
    role: Mapped[UserRole] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.MODELO,
    )
    user_type: Mapped[Optional[UserType]] = mapped_column(
        String(30),
        nullable=True,
        default=None,
    )
    
    # --- Quota and Limits management ---
    # Global limit of photos/credits for this user
    daily_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    used_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_unlimited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quota_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Limit of models an ESTUDIO_ADMIN can create (Set by MACONDO_ADMIN)
    max_models_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    
    # Studio relationship (for MODELO users belonging to a studio)
    studio_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, 
        default=None
    )
    
    # Legacy field - kept for backward compatibility in DB, acts like studio_id
    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, default=None
    )
    
    # Status flags
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Chat extension authorization
    chat_authorized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    chat_authorized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    chat_authorized_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=utcnow)

    # Relationships
    media: Mapped[List["Media"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    tasks: Mapped[List["Task"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    
    # Self-referential relationship for studio -> models
    models: Mapped[List["User"]] = relationship(
        "User",
        backref="studio",
        remote_side=[id],
        foreign_keys=[studio_id],
    )
    
    # Notifications
    notifications: Mapped[List["Notification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Notification.user_id",
    )
    
    # Billing records
    billing_records: Mapped[List["BillingRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="BillingRecord.user_id",
    )
    
    @property
    def is_macondo_admin(self) -> bool:
        """Check if user is a Macondo Admin (Super Admin)."""
        return self.role == UserRole.MACONDO_ADMIN

    @property
    def is_admin(self) -> bool:
        """Alias for backward compatibility: Check if user has admin privileges."""
        return self.role == UserRole.MACONDO_ADMIN
    
    @property
    def is_studio_admin(self) -> bool:
        """Check if user is a Studio Admin."""
        return self.role == UserRole.ESTUDIO_ADMIN
    
    @property
    def is_model(self) -> bool:
        """Check if user is a Model."""
        return self.role == UserRole.MODELO