import secrets
from datetime import date, timedelta
from uuid import UUID

from app.core.exceptions import forbidden
from app.integrations.identity import Principal
from app.modules.coupons import models as m
from app.modules.coupons import schemas as s
from app.modules.coupons.exceptions import (
    CouponLockedError,
    CouponNotFound,
    RedemptionNotActiveError,
    RedemptionNotFound,
)
from app.modules.coupons.models import COUPON_VALIDITY_DAYS
from app.modules.coupons.repository import CouponRepository, TitledRedemption
from app.modules.dependents.service import DependentService
from app.modules.points.service import PointsService
from app.shared.clock import Clock
from app.shared.schemas import Page
from app.shared.transaction import commit

TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I ambiguity
EXPIRATION_WARNING_DAYS = 2  # proposal: window before a redemption is surfaced as "vencendo"


def generate_token() -> str:
    groups = ["".join(secrets.choice(TOKEN_ALPHABET) for _ in range(4)) for _ in range(2)]
    return "SFP-" + "-".join(groups)


class CouponService:
    def __init__(
        self,
        repo: CouponRepository,
        points: PointsService,
        dependents: DependentService,
        clock: Clock,
    ):
        self.repo = repo
        self.points = points
        self.dependents = dependents
        self.clock = clock

    def _to_out(self, coupon: m.Coupon, actor: Principal) -> s.CouponOut:
        locked = bool(coupon.plan_ids) and actor.plan_id not in coupon.plan_ids
        return s.CouponOut(
            id=coupon.id,
            created_at=coupon.created_at,
            updated_at=coupon.updated_at,
            title=coupon.title,
            description=coupon.description,
            cost_points=coupon.cost_points,
            provider_id=coupon.provider_id,
            active=coupon.active,
            plan_ids=coupon.plan_ids,
            locked=locked,
        )

    def list_coupons(self, actor: Principal, page: int, size: int) -> Page[s.CouponOut]:
        items, total = self.repo.list_active(page, size)
        return Page(
            items=[self._to_out(i, actor) for i in items], total=total, page=page, size=size
        )

    def expiring_soon(self, account_id: UUID) -> list[TitledRedemption]:
        now = self.clock.now()
        return self.repo.expiring_soon(
            account_id, now, now + timedelta(days=EXPIRATION_WARNING_DAYS)
        )

    def _resolve_account_and_beneficiary(
        self, actor: Principal, beneficiary_id: UUID | None
    ) -> tuple[UUID, UUID | None]:
        if "dependent" in actor.roles:
            dependent = self.dependents.context_for_dependent_actor(actor)
            if not dependent.can_redeem_coupons:
                raise forbidden()
            return dependent.account_id, dependent.id
        account = self.points.account_for_manager(actor.user_id)
        if beneficiary_id is not None:
            dependent = self.dependents.get_in_account(beneficiary_id, account.id)
            if not dependent.can_redeem_coupons:
                raise forbidden()
            return account.id, dependent.id
        return account.id, None

    def redeem(
        self, coupon_id: UUID, data: s.RedeemIn, actor: Principal, idempotency_key: UUID | None
    ) -> s.RedemptionOut:
        account_id, beneficiary_id = self._resolve_account_and_beneficiary(
            actor, data.beneficiary_id
        )

        if idempotency_key is not None:
            existing = self.repo.get_existing_by_idempotency_key(account_id, idempotency_key)
            if existing is not None:
                return s.RedemptionOut.model_validate(existing)

        coupon = self.repo.get(coupon_id)
        if coupon is None or not coupon.active:
            raise CouponNotFound()
        if coupon.plan_ids and actor.plan_id not in coupon.plan_ids:
            raise CouponLockedError()

        def action() -> s.RedemptionOut:
            self.points.apply(account_id, "debit", coupon.cost_points, f"Resgate: {coupon.title}")
            now = self.clock.now()
            redemption = m.Redemption(
                coupon_id=coupon.id,
                account_id=account_id,
                redeemed_by=actor.user_id,
                beneficiary_id=beneficiary_id,
                token=generate_token(),
                status="active",
                points_debited=coupon.cost_points,
                idempotency_key=idempotency_key,
                expires_at=now + timedelta(days=COUPON_VALIDITY_DAYS),
            )
            self.repo.add(redemption)
            return s.RedemptionOut.model_validate(redemption)

        return commit(self.repo.session, action)

    def history(
        self,
        actor: Principal,
        page: int,
        size: int,
        status: str | None,
        since: date | None,
        until: date | None,
    ) -> Page[s.RedemptionOut]:
        account_id, _ = self._resolve_account_and_beneficiary(actor, None)

        def expire() -> None:
            self.repo.expire_overdue(account_id, self.clock.now())

        commit(self.repo.session, expire)
        items, total = self.repo.redemptions_for_account(
            account_id, page, size, status, since, until
        )
        return Page(
            items=[s.RedemptionOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def use_token(self, token: str) -> s.RedemptionOut:
        def expire_if_needed() -> None:
            redemption = self.repo.get_redemption_for_update_by_token(token)
            if (
                redemption is not None
                and redemption.status == "active"
                and redemption.expires_at < self.clock.now()
            ):
                redemption.status = "expired"
                self.repo.add(redemption)

        commit(self.repo.session, expire_if_needed)

        def action() -> s.RedemptionOut:
            redemption = self.repo.get_redemption_for_update_by_token(token)
            if redemption is None:
                raise RedemptionNotFound()
            if redemption.status != "active":
                raise RedemptionNotActiveError()
            redemption.status = "used"
            redemption.used_at = self.clock.now()
            self.repo.add(redemption)
            return s.RedemptionOut.model_validate(redemption)

        return commit(self.repo.session, action)
