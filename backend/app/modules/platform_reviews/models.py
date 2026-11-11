import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import TimestampMixin, UUIDMixin


class ReviewerProfile(StrEnum):
    VISITOR = "visitor"
    USER = "user"
    PROVIDER = "provider"
    COMPANY = "company"


class PlatformReview(UUIDMixin, TimestampMixin, Base):
    """Avaliação da PLATAFORMA (rodapé do site). Não confundir com avaliação de prestador (D02)."""

    __tablename__ = "platform_reviews"
    __table_args__ = (
        CheckConstraint("rating between 1 and 5", name="ck_platform_reviews_rating_range"),
        CheckConstraint(
            "reviewer_profile in ('visitor', 'user', 'provider', 'company')",
            name="ck_platform_reviews_reviewer_profile",
        ),
        Index("ix_platform_reviews_rating", "rating"),
    )

    author_name: Mapped[str] = mapped_column(String(120))
    reviewer_profile: Mapped[str] = mapped_column(String(20))
    rating: Mapped[int] = mapped_column(SmallInteger)
    comment: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    # Só avaliações publicadas pelo admin aparecem em "Vozes da nossa comunidade".
    is_published: Mapped[bool] = mapped_column(default=False, server_default=false())
    admin_reply: Mapped[str | None] = mapped_column(Text)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replied_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
