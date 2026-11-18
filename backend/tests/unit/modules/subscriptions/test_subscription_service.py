from dataclasses import dataclass, field
from datetime import timedelta
from uuid import UUID, uuid4

import pytest

from app.modules.plans.exceptions import PlanNotFoundError
from app.modules.subscriptions.exceptions import AlreadySubscribedError, TermsNotAcceptedError
from app.modules.subscriptions.gateway import GatewayCharge, SimulatedGateway
from app.modules.subscriptions.models import SubscriptionStatus
from app.modules.subscriptions.service import SUBSCRIPTION_PERIOD_DAYS, SubscriptionService


@dataclass
class FakePlan:
    code: str
    price_cents: int
    id: UUID = field(default_factory=uuid4)
    is_active: bool = True


@dataclass
class FakeSubscription:
    user_id: UUID
    plan: FakePlan
    status: str
    started_at: object
    current_period_end: object
    terms_accepted_at: object
    gateway_provider: str | None
    gateway_subscription_id: str | None
    canceled_at: object = None

    @property
    def plan_id(self) -> UUID:
        return self.plan.id


class FakePlans:
    def __init__(self, *plans: FakePlan) -> None:
        self._plans = {p.code: p for p in plans}

    def get_by_code(self, code: str) -> FakePlan | None:
        return self._plans.get(code)


class FakeSubs:
    def __init__(self) -> None:
        self.items: list[FakeSubscription] = []

    def get_active_for_user(self, user_id: UUID) -> FakeSubscription | None:
        return next(
            (
                s
                for s in self.items
                if s.user_id == user_id and s.status == SubscriptionStatus.ACTIVE.value
            ),
            None,
        )

    def add(self, *, status: SubscriptionStatus, **kwargs) -> FakeSubscription:  # type: ignore[no-untyped-def]
        sub = FakeSubscription(status=status.value, **kwargs)
        self.items.append(sub)
        return sub


class PendingGateway:
    def start_subscription(self, **_: object) -> GatewayCharge:
        return GatewayCharge("fake", "ext_1", SubscriptionStatus.PENDING)

    def cancel_subscription(self, external_id: str) -> None:
        return None


FREE = FakePlan("free", 0)
AURA = FakePlan("aura", 4990)


@pytest.fixture
def user_id() -> UUID:
    return uuid4()


def _service(clock, uow, subs=None, gateway=None):  # type: ignore[no-untyped-def]
    subs = subs or FakeSubs()
    service = SubscriptionService(
        subs,
        FakePlans(FREE, AURA),
        gateway or SimulatedGateway(),
        uow,
        clock,  # type: ignore[arg-type]
    )
    return service, subs


def test_assign_free_plan_creates_active_free_subscription_without_commit(
    clock, uow, user_id
) -> None:  # type: ignore[no-untyped-def]
    service, subs = _service(clock, uow)
    service.assign_free_plan(user_id)

    assert subs.items[0].plan.code == "free"
    assert subs.items[0].status == "active"
    assert uow.commits == 0


def test_assign_free_plan_without_seeded_plan_raises(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service = SubscriptionService(FakeSubs(), FakePlans(), SimulatedGateway(), uow, clock)  # type: ignore[arg-type]
    with pytest.raises(PlanNotFoundError):
        service.assign_free_plan(user_id)


def test_subscribe_paid_plan_without_accepting_terms_raises(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service, _ = _service(clock, uow)
    with pytest.raises(TermsNotAcceptedError):
        service.subscribe(user_id, plan_code="aura", accept_terms=False)


def test_subscribe_unknown_plan_raises(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service, _ = _service(clock, uow)
    with pytest.raises(PlanNotFoundError):
        service.subscribe(user_id, plan_code="inexistente", accept_terms=True)


def test_subscribe_paid_plan_cancels_current_and_activates_new(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service, subs = _service(clock, uow)
    service.assign_free_plan(user_id)

    new = service.subscribe(user_id, plan_code="aura", accept_terms=True)

    assert new.plan.code == "aura"
    assert new.status == "active"
    assert new.gateway_provider == "simulated"
    assert new.terms_accepted_at == clock.now()
    assert new.current_period_end == clock.now() + timedelta(days=SUBSCRIPTION_PERIOD_DAYS)
    assert [s.status for s in subs.items] == ["canceled", "active"]
    assert subs.items[0].canceled_at == clock.now()
    assert uow.flushes == 1  # cancelou antes de inserir
    assert uow.commits == 1


def test_subscribe_same_plan_raises_conflict(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service, _ = _service(clock, uow)
    service.assign_free_plan(user_id)
    service.subscribe(user_id, plan_code="aura", accept_terms=True)
    with pytest.raises(AlreadySubscribedError):
        service.subscribe(user_id, plan_code="aura", accept_terms=True)


def test_subscribe_free_plan_downgrades_without_terms(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service, subs = _service(clock, uow)
    service.assign_free_plan(user_id)
    service.subscribe(user_id, plan_code="aura", accept_terms=True)

    downgraded = service.subscribe(user_id, plan_code="free", accept_terms=False)

    assert downgraded.plan.code == "free"
    assert downgraded.current_period_end is None
    assert subs.get_active_for_user(user_id) is downgraded


def test_subscribe_with_pending_gateway_keeps_current_plan_active(clock, uow, user_id) -> None:  # type: ignore[no-untyped-def]
    service, subs = _service(clock, uow, gateway=PendingGateway())
    service.assign_free_plan(user_id)

    pending = service.subscribe(user_id, plan_code="aura", accept_terms=True)

    assert pending.status == "pending"
    assert subs.get_active_for_user(user_id).plan.code == "free"  # type: ignore[union-attr]
