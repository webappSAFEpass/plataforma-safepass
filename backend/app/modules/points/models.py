from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class ManagerAccount(Record, Base):
    """The "conta gestora": one per managing user, concentrates points and plan."""

    __tablename__ = "manager_accounts"
    manager_user_id: Mapped[UUID] = mapped_column(unique=True, index=True)
    plan_id: Mapped[UUID | None] = mapped_column(index=True)
    balance: Mapped[int] = mapped_column(default=0)


class PointTransaction(Record, Base):
    __tablename__ = "point_transactions"
    __table_args__ = (
        CheckConstraint("type IN ('credit','debit')", name="point_transaction_type"),
        CheckConstraint("amount > 0", name="point_transaction_amount_positive"),
        Index("ix_point_transactions_account_created", "account_id", "created_at"),
    )
    account_id: Mapped[UUID] = mapped_column(ForeignKey("manager_accounts.id"), index=True)
    type: Mapped[str] = mapped_column(String(10))
    amount: Mapped[int]
    origin: Mapped[str] = mapped_column(String(160))
    # Soft reference only: redemptions live in the coupons module and would
    # otherwise create a circular FK between the two modules' migrations.
    redemption_id: Mapped[UUID | None] = mapped_column(index=True)
