from datetime import datetime, timedelta
from uuid import UUID

from app.integrations.identity import Principal
from app.modules.alerts import models as m
from app.modules.alerts import schemas as s
from app.modules.alerts.repository import AlertRepository
from app.shared.clock import Clock
from app.shared.schemas import Page
from app.shared.transaction import commit


class AlertService:
    def __init__(self, repo: AlertRepository, clock: Clock):
        self.repo = repo
        self.clock = clock

    def list_alerts(self, actor: Principal, page: int, size: int) -> Page[s.AlertOut]:
        items, total = self.repo.list_for_user(actor.user_id, page, size)
        return Page(
            items=[s.AlertOut.model_validate(i) for i in items], total=total, page=page, size=size
        )

    def create_manual(self, data: s.AlertIn, actor: Principal) -> s.AlertOut:
        def action() -> s.AlertOut:
            record = m.Alert(
                user_id=actor.user_id,
                type="manual",
                message=data.message,
                occurs_on=data.occurs_on,
            )
            self.repo.add(record)
            return s.AlertOut.model_validate(record)

        return commit(self.repo.session, action)

    def ensure_expiration_alert(self, user_id: UUID, message: str) -> None:
        """Idempotent: safe to call once per day per redemption without duplicating alerts."""
        today = self.clock.now().date()
        if self.repo.has_alert(user_id, "expiration", message, today):
            return

        def action() -> None:
            self.repo.add(
                m.Alert(user_id=user_id, type="expiration", message=message, occurs_on=today)
            )

        commit(self.repo.session, action)

    def agenda(self, actor: Principal) -> list[s.ScheduleEventOut]:
        now = self.clock.now()
        start = datetime.combine(now.date(), datetime.min.time(), tzinfo=now.tzinfo)
        end = datetime.combine(
            now.date() + timedelta(days=7), datetime.max.time(), tzinfo=now.tzinfo
        )
        items = self.repo.agenda_for_user(actor.user_id, start, end)
        return [s.ScheduleEventOut.model_validate(i) for i in items]
