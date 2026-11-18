from datetime import date
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class Dependent(Record, Base):
    __tablename__ = "dependents"
    __table_args__ = (CheckConstraint("type IN ('person','pet')", name="dependent_type"),)
    account_id: Mapped[UUID] = mapped_column(ForeignKey("manager_accounts.id"), index=True)
    type: Mapped[str] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(String(160))
    birth_date: Mapped[date | None]
    bond: Mapped[str | None] = mapped_column(String(80))
    species: Mapped[str | None] = mapped_column(String(80))
    can_redeem_coupons: Mapped[bool] = mapped_column(default=False)
    linked_user_id: Mapped[UUID | None] = mapped_column(unique=True, index=True)
    active: Mapped[bool] = mapped_column(default=True, index=True)
