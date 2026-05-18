"""Media ORM model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

# --- CORRECCIÓN: Se agregó 'Boolean' a esta línea de importaciones ---
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class MediaType(str, enum.Enum):
    """Supported generated media types."""

    PHOTO = "PHOTO"
    VIDEO = "VIDEO"


class Media(Base):
    """Generated media asset linked to a user."""

    __tablename__ = "media"

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
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type"),
        nullable=False,
    )
    legacy_prompt: Mapped[str] = mapped_column("prompt", Text, nullable=False)
    original_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    storage_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)

    # Cost tracking — nullable so existing rows without cost are still valid.
    cost_usd: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=10, scale=6), nullable=True, default=None
    )
    # Which DashScope model produced this asset.
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default=None)

    # Edit tracking (Module D)
    edit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    parent_media_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, default=None
    )
    
    # Aprobación de la imagen (nuevo campo)
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship(back_populates="media")
    tasks: Mapped[List["Task"]] = relationship(back_populates="media")