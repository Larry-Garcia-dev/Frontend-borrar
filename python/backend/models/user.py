"""User ORM model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base



def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    """Authorization role for a user."""

    ADMIN = "ADMIN"
    CREATOR = "CREATOR"
    VENDOR = "VENDOR"


class User(Base):
    """Application user entity."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        String(20),
        nullable=False,
        default=UserRole.CREATOR,
    )
    daily_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    used_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_unlimited: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quota_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, default=None
    )

    media: Mapped[List["Media"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    tasks: Mapped[List["Task"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
