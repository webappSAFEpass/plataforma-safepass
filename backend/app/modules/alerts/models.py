from datetime import date, datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class Alert(Record, Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("type IN ('manual','limit','expiration')", name="alert_type"),
    )
    user_id: Mapped[UUID] = mapped_column(index=True)
    type: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(String(500))
    occurs_on: Mapped[date] = mapped_column(index=True)
    read: Mapped[bool] = mapped_column(default=False)


class ScheduleEvent(Record, Base):
    """Backs the dashboard's "agenda dos próximos 7 dias" (US02 / evento_agenda)."""

    __tablename__ = "schedule_events"
    user_id: Mapped[UUID] = mapped_column(index=True)
    dependent_id: Mapped[UUID | None] = mapped_column(ForeignKey("dependents.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
