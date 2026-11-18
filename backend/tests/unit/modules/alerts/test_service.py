from datetime import UTC, datetime
from unittest.mock import Mock
from uuid import uuid4

from app.modules.alerts.repository import AlertRepository
from app.modules.alerts.service import AlertService
from tests.support import FixedClock

NOW = datetime(2026, 10, 20, 12, 0, tzinfo=UTC)


def test_ensure_expiration_alert_is_idempotent_for_the_same_day():
    repo = Mock(spec=AlertRepository)
    repo.session = Mock()
    repo.has_alert.return_value = False
    service = AlertService(repo, FixedClock(NOW))
    user_id = uuid4()

    service.ensure_expiration_alert(user_id, "Cupom vence em breve.")

    repo.add.assert_called_once()


def test_ensure_expiration_alert_skips_when_already_created_today():
    repo = Mock(spec=AlertRepository)
    repo.has_alert.return_value = True
    service = AlertService(repo, FixedClock(NOW))

    service.ensure_expiration_alert(uuid4(), "Cupom vence em breve.")

    repo.add.assert_not_called()
