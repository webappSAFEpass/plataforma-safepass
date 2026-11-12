from datetime import UTC, datetime, timedelta
from unittest.mock import Mock
from uuid import uuid4

import pytest

from app.core.exceptions import DomainError
from app.integrations.identity import Principal
from app.modules.coupons.exceptions import (
    CouponLockedError,
    CouponNotFound,
    RedemptionNotActiveError,
)
from app.modules.coupons.models import COUPON_VALIDITY_DAYS, Coupon, CouponPlan, Redemption
from app.modules.coupons.repository import CouponRepository
from app.modules.coupons.schemas import RedeemIn
from app.modules.coupons.service import CouponService
from app.modules.dependents.models import Dependent
from app.modules.dependents.repository import DependentRepository
from app.modules.dependents.service import DependentService
from app.modules.points.exceptions import InsufficientBalanceError
from app.modules.points.models import ManagerAccount
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from tests.support import FixedClock, stamp_record

NOW = datetime(2026, 10, 20, 12, 0, tzinfo=UTC)


def _coupon(plan_ids: list | None = None, cost_points: int = 100, active: bool = True) -> Coupon:
    coupon = Coupon(
        id=uuid4(), title="Desconto", description="", cost_points=cost_points, active=active
    )
    coupon.plan_links = [CouponPlan(plan_id=p) for p in (plan_ids or [])]
    return coupon


def _service(
    account: ManagerAccount, coupon_repo: Mock | None = None, dep_repo: Mock | None = None
) -> tuple[CouponService, Mock, Mock]:
    coupon_repo = coupon_repo or Mock(spec=CouponRepository)
    coupon_repo.session = Mock()
    coupon_repo.add.side_effect = stamp_record
    points_repo = Mock(spec=PointsRepository)
    points_repo.get_by_manager.return_value = account
    points_repo.get_for_update.return_value = account
    points = PointsService(points_repo)
    dep_repo = dep_repo or Mock(spec=DependentRepository)
    dependents = DependentService(dep_repo, points)
    service = CouponService(coupon_repo, points, dependents, FixedClock(NOW))
    return service, coupon_repo, dep_repo


def test_redeem_locked_coupon_outside_actor_plan_raises():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=1000)
    coupon = _coupon(plan_ids=[uuid4()])
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get.return_value = coupon
    coupon_repo.get_existing_by_idempotency_key.return_value = None
    service, *_ = _service(account, coupon_repo=coupon_repo)
    actor = Principal(manager_id, frozenset({"user"}), plan_id=uuid4())

    with pytest.raises(CouponLockedError):
        service.redeem(coupon.id, RedeemIn(), actor, None)


def test_redeem_debits_points_and_issues_token_with_seven_day_expiry():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=1000)
    coupon = _coupon(cost_points=300)
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get.return_value = coupon
    coupon_repo.get_existing_by_idempotency_key.return_value = None
    service, coupon_repo, _ = _service(account, coupon_repo=coupon_repo)
    actor = Principal(manager_id, frozenset({"user"}))

    result = service.redeem(coupon.id, RedeemIn(), actor, None)

    assert account.balance == 700
    assert result.points_debited == 300
    assert result.expires_at == NOW + timedelta(days=COUPON_VALIDITY_DAYS)
    assert result.token.startswith("SFP-")
    coupon_repo.session.commit.assert_called()


def test_redeem_insufficient_balance_debits_nothing():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=10)
    coupon = _coupon(cost_points=300)
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get.return_value = coupon
    coupon_repo.get_existing_by_idempotency_key.return_value = None
    service, coupon_repo, _ = _service(account, coupon_repo=coupon_repo)
    actor = Principal(manager_id, frozenset({"user"}))

    with pytest.raises(InsufficientBalanceError):
        service.redeem(coupon.id, RedeemIn(), actor, None)
    assert account.balance == 10
    coupon_repo.add.assert_not_called()


def test_redeem_with_known_idempotency_key_returns_existing_without_double_debit():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=1000)
    coupon = _coupon(cost_points=50)
    existing = Redemption(
        id=uuid4(),
        coupon_id=coupon.id,
        account_id=account.id,
        redeemed_by=manager_id,
        token="SFP-AAAA-BBBB",
        status="active",
        points_debited=50,
        idempotency_key=uuid4(),
        expires_at=NOW + timedelta(days=7),
    )
    stamp_record(existing)
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get_existing_by_idempotency_key.return_value = existing
    service, coupon_repo, _ = _service(account, coupon_repo=coupon_repo)
    actor = Principal(manager_id, frozenset({"user"}))

    result = service.redeem(coupon.id, RedeemIn(), actor, existing.idempotency_key)

    assert result.token == existing.token
    assert account.balance == 1000
    coupon_repo.get.assert_not_called()


def test_dependent_without_permission_cannot_redeem():
    manager_id = uuid4()
    dependent_user_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=1000)
    dependent = Dependent(
        id=uuid4(),
        account_id=account.id,
        type="person",
        name="Lucas",
        can_redeem_coupons=False,
        linked_user_id=dependent_user_id,
        active=True,
    )
    dep_repo = Mock(spec=DependentRepository)
    dep_repo.by_linked_user.return_value = dependent
    coupon = _coupon(cost_points=10)
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get.return_value = coupon
    coupon_repo.get_existing_by_idempotency_key.return_value = None
    service, *_ = _service(account, coupon_repo=coupon_repo, dep_repo=dep_repo)
    actor = Principal(dependent_user_id, frozenset({"dependent"}))

    with pytest.raises(DomainError) as error:
        service.redeem(coupon.id, RedeemIn(), actor, None)
    assert error.value.status_code == 403


def test_dependent_with_permission_can_redeem_for_self():
    manager_id = uuid4()
    dependent_user_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=1000)
    dependent = Dependent(
        id=uuid4(),
        account_id=account.id,
        type="person",
        name="Lucas",
        can_redeem_coupons=True,
        linked_user_id=dependent_user_id,
        active=True,
    )
    dep_repo = Mock(spec=DependentRepository)
    dep_repo.by_linked_user.return_value = dependent
    coupon = _coupon(cost_points=10)
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get.return_value = coupon
    coupon_repo.get_existing_by_idempotency_key.return_value = None
    service, *_ = _service(account, coupon_repo=coupon_repo, dep_repo=dep_repo)
    actor = Principal(dependent_user_id, frozenset({"dependent"}))

    result = service.redeem(coupon.id, RedeemIn(), actor, None)

    assert result.status == "active"
    assert account.balance == 990


def test_redeem_unknown_coupon_raises_not_found():
    manager_id = uuid4()
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=1000)
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.get.return_value = None
    coupon_repo.get_existing_by_idempotency_key.return_value = None
    service, *_ = _service(account, coupon_repo=coupon_repo)
    actor = Principal(manager_id, frozenset({"user"}))

    with pytest.raises(CouponNotFound):
        service.redeem(uuid4(), RedeemIn(), actor, None)


def _token_service(redemption: Redemption) -> CouponService:
    coupon_repo = Mock(spec=CouponRepository)
    coupon_repo.session = Mock()
    coupon_repo.add.side_effect = stamp_record
    coupon_repo.get_redemption_for_update_by_token.return_value = redemption
    points_repo = Mock(spec=PointsRepository)
    points = PointsService(points_repo)
    dependents = DependentService(Mock(spec=DependentRepository), points)
    return CouponService(coupon_repo, points, dependents, FixedClock(NOW))


def test_use_token_marks_active_redemption_as_used():
    redemption = Redemption(
        id=uuid4(),
        coupon_id=uuid4(),
        account_id=uuid4(),
        redeemed_by=uuid4(),
        token="SFP-AAAA-BBBB",
        status="active",
        points_debited=10,
        expires_at=NOW + timedelta(days=1),
    )
    service = _token_service(redemption)

    result = service.use_token(redemption.token)

    assert result.status == "used"
    assert result.used_at == NOW


def test_use_token_already_used_raises_conflict():
    redemption = Redemption(
        id=uuid4(),
        coupon_id=uuid4(),
        account_id=uuid4(),
        redeemed_by=uuid4(),
        token="SFP-AAAA-BBBB",
        status="used",
        points_debited=10,
        expires_at=NOW + timedelta(days=1),
        used_at=NOW,
    )
    service = _token_service(redemption)

    with pytest.raises(RedemptionNotActiveError):
        service.use_token(redemption.token)


def test_use_token_past_expiry_is_marked_expired_and_rejected():
    redemption = Redemption(
        id=uuid4(),
        coupon_id=uuid4(),
        account_id=uuid4(),
        redeemed_by=uuid4(),
        token="SFP-AAAA-BBBB",
        status="active",
        points_debited=10,
        expires_at=NOW - timedelta(minutes=1),
    )
    service = _token_service(redemption)

    with pytest.raises(RedemptionNotActiveError):
        service.use_token(redemption.token)
    assert redemption.status == "expired"
