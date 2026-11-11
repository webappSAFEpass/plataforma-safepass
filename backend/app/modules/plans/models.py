from typing import Any

from sqlalchemy import CheckConstraint, Integer, SmallInteger, String, false, text, true
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import TimestampMixin, UUIDMixin


class Plan(UUIDMixin, TimestampMixin, Base):
    """Plano de assinatura. Limites e preços vivem aqui (parametrizados), nunca no código."""

    __tablename__ = "plans"
    __table_args__ = (CheckConstraint("price_cents >= 0", name="ck_plans_price_non_negative"),)

    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(60))
    price_cents: Mapped[int] = mapped_column(Integer)
    # Ordem de elegibilidade (0 = Free). Cupons de tier maior aparecem bloqueados.
    tier: Mapped[int] = mapped_column(SmallInteger)
    # None = ilimitado
    max_dependents: Mapped[int | None] = mapped_column(Integer)
    monthly_review_limit: Mapped[int | None] = mapped_column(Integer)
    points_multiplier: Mapped[int] = mapped_column(SmallInteger, default=1, server_default="1")
    highlighted: Mapped[bool] = mapped_column(default=False, server_default=false())
    # Lista de {"label": str, "included": bool}, exibida na landing e na página do plano.
    features: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
