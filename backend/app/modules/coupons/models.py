from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.shared.models import Record

COUPON_VALIDITY_DAYS = 7


class Coupon(Record, Base):
    __tablename__ = "coupons"
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(2000), default="")
    cost_points: Mapped[int]
    # External catalog reference (Desafio 03); no FK, see app/integrations/provider_catalog.py.
    provider_id: Mapped[UUID | None] = mapped_column(index=True)
    active: Mapped[bool] = mapped_column(default=True)
    plan_links: Mapped[list["CouponPlan"]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )

    @property
    def plan_ids(self) -> list[UUID]:
        return [link.plan_id for link in self.plan_links]


class CouponPlan(Record, Base):
    __tablename__ = "coupon_plans"
    __table_args__ = (UniqueConstraint("coupon_id", "plan_id"),)
    coupon_id: Mapped[UUID] = mapped_column(ForeignKey("coupons.id"), index=True)
    plan_id: Mapped[UUID] = mapped_column(index=True)  # external, Desafio 01, no FK


class Redemption(Record, Base):
    __tablename__ = "redemptions"
    __table_args__ = (
        CheckConstraint("status IN ('active','used','expired')", name="redemption_status"),
        UniqueConstraint("account_id", "idempotency_key", name="redemption_idempotency"),
    )
    coupon_id: Mapped[UUID] = mapped_column(ForeignKey("coupons.id"), index=True)
    account_id: Mapped[UUID] = mapped_column(ForeignKey("manager_accounts.id"), index=True)
    redeemed_by: Mapped[UUID]
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("dependents.id"), index=True)
    token: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(10), default="active", index=True)
    points_debited: Mapped[int]
    idempotency_key: Mapped[UUID | None] = mapped_column(index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
