from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.plans.models import Plan
from app.modules.subscriptions.models import Subscription, SubscriptionStatus


class SubscriptionRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_active_for_user(self, user_id: UUID) -> Subscription | None:
        stmt = select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE.value,
        )
        return self._db.scalar(stmt)

    def add(
        self,
        *,
        user_id: UUID,
        plan: Plan,
        status: SubscriptionStatus,
        started_at: datetime,
        current_period_end: datetime | None,
        terms_accepted_at: datetime | None,
        gateway_provider: str | None,
        gateway_subscription_id: str | None,
    ) -> Subscription:
        subscription = Subscription(
            user_id=user_id,
            plan=plan,
            status=status.value,
            started_at=started_at,
            current_period_end=current_period_end,
            terms_accepted_at=terms_accepted_at,
            gateway_provider=gateway_provider,
            gateway_subscription_id=gateway_subscription_id,
        )
        self._db.add(subscription)
        self._db.flush()
        return subscription
