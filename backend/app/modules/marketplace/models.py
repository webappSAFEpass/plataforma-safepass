from uuid import UUID

from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class Favorite(Record, Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "provider_id", name="favorite_unique"),)
    user_id: Mapped[UUID] = mapped_column(index=True)
    # External catalog reference (Desafio 03); no FK, see app/integrations/provider_catalog.py.
    provider_id: Mapped[UUID] = mapped_column(index=True)
