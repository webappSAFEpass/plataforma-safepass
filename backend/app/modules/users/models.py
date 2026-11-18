from sqlalchemy import CheckConstraint, String, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import TimestampMixin, UUIDMixin


class User(UUIDMixin, TimestampMixin, Base):
    """Conta central de qualquer papel. Perfis específicos ficam nos módulos de cada squad."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role in ('user', 'dependent', 'provider', 'company', 'admin')",
            name="ck_users_role",
        ),
    )

    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20), index=True)
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
