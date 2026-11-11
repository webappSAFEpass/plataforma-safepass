from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class Company(Record, Base):
    __tablename__ = "companies"
    responsible_user_id: Mapped[UUID] = mapped_column(index=True)
    legal_name: Mapped[str] = mapped_column(String(160))
    trade_name: Mapped[str] = mapped_column(String(160))
    cnpj: Mapped[str] = mapped_column(String(14), unique=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(254))
    active: Mapped[bool] = mapped_column(default=True)


class Employee(Record, Base):
    __tablename__ = "company_employees"
    __table_args__ = (
        UniqueConstraint("company_id", "user_id"),
        CheckConstraint("role IN ('hr','employee')", name="employee_role"),
    )
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(index=True)
    employee_number: Mapped[str | None] = mapped_column(String(60))
    department: Mapped[str | None] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(16), default="employee")
    active: Mapped[bool] = mapped_column(default=True, index=True)
