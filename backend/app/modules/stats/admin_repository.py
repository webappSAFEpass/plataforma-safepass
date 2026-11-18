"""Consultas agregadas para o painel administrativo do Desafio 01."""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.modules.platform_reviews.models import PlatformReview
from app.modules.referrals.models import Referral
from app.modules.subscriptions.models import Subscription, SubscriptionStatus
from app.modules.users.models import User


@dataclass(frozen=True)
class AdminDashboardSnapshot:
    active_users: int
    providers: int
    companies: int
    active_subscriptions: int
    total_reviews: int
    pending_reviews: int
    total_referrals: int
    new_referrals: int


class AdminDashboardRepository:
    """Mantém SQL fora do router e centraliza as métricas agregadas do D01."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def snapshot(self) -> AdminDashboardSnapshot:
        active_users = self._count(
            select(func.count())
            .select_from(User)
            .where(User.is_active.is_(True), User.role == "user")
        )
        providers = self._count(
            select(func.count())
            .select_from(User)
            .where(User.is_active.is_(True), User.role == "provider")
        )
        companies = self._count(
            select(func.count())
            .select_from(User)
            .where(User.is_active.is_(True), User.role == "company")
        )
        active_subscriptions = self._count(
            select(func.count())
            .select_from(Subscription)
            .where(Subscription.status == SubscriptionStatus.ACTIVE.value)
        )
        total_reviews = self._count(select(func.count()).select_from(PlatformReview))
        pending_reviews = self._count(
            select(func.count())
            .select_from(PlatformReview)
            .where(PlatformReview.is_published.is_(False))
        )
        total_referrals = self._count(select(func.count()).select_from(Referral))
        new_referrals = self._count(
            select(func.count()).select_from(Referral).where(Referral.status == "new")
        )
        return AdminDashboardSnapshot(
            active_users=active_users,
            providers=providers,
            companies=companies,
            active_subscriptions=active_subscriptions,
            total_reviews=total_reviews,
            pending_reviews=pending_reviews,
            total_referrals=total_referrals,
            new_referrals=new_referrals,
        )

    def _count(self, statement: Select[tuple[int]]) -> int:
        # SQLAlchemy's scalar may return None for an aggregate on an empty table.
        return int(self._db.scalar(statement) or 0)
