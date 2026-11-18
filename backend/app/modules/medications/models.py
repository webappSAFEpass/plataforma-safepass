from datetime import date
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class Medication(Record, Base):
    """Medicamento manual ou item de receita confirmada (um por linha, com id próprio)."""

    __tablename__ = "medications"
    __table_args__ = (
        CheckConstraint("source IN ('manual','prescription')", name="medication_source"),
        CheckConstraint("duration_days IS NULL OR duration_days > 0", name="medication_duration"),
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    dependent_id: Mapped[UUID | None] = mapped_column(ForeignKey("dependents.id"), index=True)
    prescription_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("prescriptions.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(12))
    name: Mapped[str] = mapped_column(String(160))
    dose: Mapped[str] = mapped_column(String(80), default="")
    posology: Mapped[str] = mapped_column(String(160), default="")
    start_date: Mapped[date]
    duration_days: Mapped[int | None]  # nulo = uso contínuo
    first_dose: Mapped[str] = mapped_column(String(5), default="08:00")
    ended_on: Mapped[date | None]


class DoseIntake(Record, Base):
    """Dose marcada como tomada ("Tomei"); `date` é o dia do horário avisado."""

    __tablename__ = "dose_intakes"
    __table_args__ = (UniqueConstraint("medication_id", "date", "time", name="uq_dose_intake"),)
    medication_id: Mapped[UUID] = mapped_column(
        ForeignKey("medications.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date]
    time: Mapped[str] = mapped_column(String(5))


class Vaccine(Record, Base):
    __tablename__ = "vaccines"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    dependent_id: Mapped[UUID | None] = mapped_column(ForeignKey("dependents.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    dose: Mapped[str] = mapped_column(String(80), default="")
    applied_on: Mapped[date]
    next_dose_on: Mapped[date | None]
    document_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), index=True
    )
    shared_with_assistant: Mapped[bool] = mapped_column(default=False)
