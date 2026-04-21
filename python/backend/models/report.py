"""ImageReport ORM model for user quality complaints."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class ReportStatus(str, enum.Enum):
    """Lifecycle states for an image quality report."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ImageReport(Base):
    """A user-submitted quality report for a generated image."""

    __tablename__ = "image_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    media_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"),
        nullable=False,
        default=ReportStatus.PENDING,
    )
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Mandatory rejection reason/disclaimer when admin rejects
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_disclaimer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Who reviewed the report
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    media: Mapped["Media"] = relationship()  # type: ignore[name-defined]  # noqa: F821
    user: Mapped["User"] = relationship(foreign_keys=[user_id])  # type: ignore[name-defined]  # noqa: F821
    reviewed_by: Mapped[Optional["User"]] = relationship(foreign_keys=[reviewed_by_id])  # type: ignore[name-defined]  # noqa: F821
