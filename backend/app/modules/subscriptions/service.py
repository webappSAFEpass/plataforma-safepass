from datetime import timedelta
from typing import TYPE_CHECKING
from uuid import UUID

from app.modules.plans.exceptions import PlanNotFoundError
from app.modules.plans.seed import FREE_PLAN_CODE
from app.modules.subscriptions.exceptions import AlreadySubscribedError, TermsNotAcceptedError
from app.modules.subscriptions.models import SubscriptionStatus
from app.shared.clock import Clock
from app.shared.uow import UnitOfWork

if TYPE_CHECKING:
    from app.modules.plans.repository import PlanRepository
    from app.modules.subscriptions.gateway import PaymentGateway
    from app.modules.subscriptions.models import Subscription
    from app.modules.subscriptions.repository import SubscriptionRepository

SUBSCRIPTION_PERIOD_DAYS = 30


class SubscriptionService:
    """Também é a porta de entrada para outros squads saberem o plano de um usuário."""

    def __init__(
        self,
        repo: "SubscriptionRepository",
        plans: "PlanRepository",
        gateway: "PaymentGateway",
        uow: UnitOfWork,
        clock: Clock,
    ) -> None:
        self._repo = repo
        self._plans = plans
        self._gateway = gateway
        self._uow = uow
        self._clock = clock

    def get_current(self, user_id: UUID) -> "Subscription | None":
        return self._repo.get_active_for_user(user_id)

    def assign_free_plan(self, user_id: UUID) -> None:
        """Usado no cadastro. Não faz commit: a transação pertence a quem chama."""
        plan = self._plans.get_by_code(FREE_PLAN_CODE)
        if plan is None:
            raise PlanNotFoundError("Plano gratuito não configurado. Rode o seed.")
        self._repo.add(
            user_id=user_id,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
            started_at=self._clock.now(),
            current_period_end=None,
            terms_accepted_at=None,
            gateway_provider=None,
            gateway_subscription_id=None,
        )

    def subscribe(self, user_id: UUID, *, plan_code: str, accept_terms: bool) -> "Subscription":
        plan = self._plans.get_by_code(plan_code)
        if plan is None or not plan.is_active:
            raise PlanNotFoundError()
        current = self._repo.get_active_for_user(user_id)
        if current is not None and current.plan_id == plan.id:
            raise AlreadySubscribedError()
        is_paid = plan.price_cents > 0
        if is_paid and not accept_terms:
            raise TermsNotAcceptedError()

        now = self._clock.now()
        provider: str | None = None
        external_id: str | None = None
        status = SubscriptionStatus.ACTIVE
        if is_paid:
            charge = self._gateway.start_subscription(
                user_id=user_id, plan_code=plan.code, amount_cents=plan.price_cents
            )
            provider, external_id, status = charge.provider, charge.external_id, charge.status

        # Só troca de plano quando o novo já está ativo; pendente mantém o plano atual.
        if status is SubscriptionStatus.ACTIVE and current is not None:
            if current.gateway_subscription_id:
                self._gateway.cancel_subscription(current.gateway_subscription_id)
            current.status = SubscriptionStatus.CANCELED.value
            current.canceled_at = now
            self._uow.flush()  # libera o índice de "uma ativa por usuário" antes do insert

        subscription = self._repo.add(
            user_id=user_id,
            plan=plan,
            status=status,
            started_at=now,
            current_period_end=(
                now + timedelta(days=SUBSCRIPTION_PERIOD_DAYS) if is_paid else None
            ),
            terms_accepted_at=now if is_paid else None,
            gateway_provider=provider,
            gateway_subscription_id=external_id,
        )
        self._uow.commit()
        return subscription
