from datetime import date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.alerts.models import Alert, ScheduleEvent
from app.shared.pagination import paginate


class AlertRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def list_for_user(self, user_id: UUID, page: int, size: int) -> tuple[list[Alert], int]:
        query = (
            select(Alert).where(Alert.user_id == user_id).order_by(Alert.occurs_on.desc(), Alert.id)
        )
        return paginate(self.session, query, page, size)

    def has_alert(self, user_id: UUID, type: str, message: str, on: date) -> bool:
        return (
            self.session.scalar(
                select(Alert.id).where(
                    Alert.user_id == user_id,
                    Alert.type == type,
                    Alert.message == message,
                    Alert.occurs_on == on,
                )
            )
            is not None
        )

    def agenda_for_user(self, user_id: UUID, start: datetime, end: datetime) -> list[ScheduleEvent]:
        return list(
            self.session.scalars(
                select(ScheduleEvent)
                .where(
                    ScheduleEvent.user_id == user_id,
                    ScheduleEvent.event_at >= start,
                    ScheduleEvent.event_at <= end,
                )
                .order_by(ScheduleEvent.event_at)
            )
        )
