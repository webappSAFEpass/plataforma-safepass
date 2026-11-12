import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import TimestampMixin, UUIDMixin


class Referral(UUIDMixin, TimestampMixin, Base):
    """Indicação de um profissional feita por um usuário (ou visitante) para a equipe SAFEpass."""

    __tablename__ = "referrals"
    __table_args__ = (
        CheckConstraint(
            "status in ('new', 'contacted', 'registered', 'rejected')",
            name="ck_referrals_status",
        ),
    )

    professional_name: Mapped[str] = mapped_column(String(120))
    specialty: Mapped[str | None] = mapped_column(String(120))
    contact: Mapped[str | None] = mapped_column(String(160))
    referrer_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="new", server_default="new")
