from datetime import date, datetime
from uuid import UUID

from pydantic import Field

from app.shared.schemas import Input, RecordOut


class AlertIn(Input):
    message: str = Field(min_length=1, max_length=500)
    occurs_on: date


class AlertOut(RecordOut):
    user_id: UUID
    type: str
    message: str
    occurs_on: date
    read: bool


class ScheduleEventOut(RecordOut):
    user_id: UUID
    dependent_id: UUID | None
    title: str
    event_at: datetime
