from uuid import UUID

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class Review(Record, Base):
    """Permanent: no delete endpoint or soft-delete flag by design (CLAUDE.md)."""

    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="review_rating_range"),)
    user_id: Mapped[UUID] = mapped_column(index=True)
    # External catalog reference (Desafio 03); no FK, see app/integrations/provider_catalog.py.
    provider_id: Mapped[UUID] = mapped_column(index=True)
    rating: Mapped[int]
    comment: Mapped[str] = mapped_column(String(2000), default="")
    provider_response: Mapped[str | None] = mapped_column(String(2000))
