from datetime import date, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.coupons.models import Coupon, Redemption
from app.shared.pagination import paginate

TitledRedemption = tuple[Redemption, str]


class CouponRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def expiring_soon(
        self, account_id: UUID, start: datetime, end: datetime
    ) -> list[TitledRedemption]:
        rows = self.session.execute(
            select(Redemption, Coupon.title)
            .join(Coupon, Coupon.id == Redemption.coupon_id)
            .where(
                Redemption.account_id == account_id,
                Redemption.status == "active",
                Redemption.expires_at >= start,
                Redemption.expires_at <= end,
            )
        ).all()
        return [(redemption, title) for redemption, title in rows]

    def get(self, coupon_id: UUID) -> Coupon | None:
        return self.session.scalar(select(Coupon).where(Coupon.id == coupon_id))

    def list_active(self, page: int, size: int) -> tuple[list[Coupon], int]:
        query = select(Coupon).where(Coupon.active).order_by(Coupon.title, Coupon.id)
        return paginate(self.session, query, page, size)

    def get_redemption(self, redemption_id: UUID) -> Redemption | None:
        return self.session.scalar(select(Redemption).where(Redemption.id == redemption_id))

    def get_redemption_for_update_by_token(self, token: str) -> Redemption | None:
        return self.session.scalar(
            select(Redemption).where(Redemption.token == token).with_for_update()
        )

    def get_existing_by_idempotency_key(
        self, account_id: UUID, idempotency_key: UUID
    ) -> Redemption | None:
        return self.session.scalar(
            select(Redemption).where(
                Redemption.account_id == account_id,
                Redemption.idempotency_key == idempotency_key,
            )
        )

    def redemptions_for_account(
        self,
        account_id: UUID,
        page: int,
        size: int,
        status: str | None,
        since: date | None,
        until: date | None,
    ) -> tuple[list[Redemption], int]:
        query = select(Redemption).where(Redemption.account_id == account_id)
        if status is not None:
            query = query.where(Redemption.status == status)
        if since is not None:
            query = query.where(
                Redemption.created_at >= datetime.combine(since, datetime.min.time())
            )
        if until is not None:
            query = query.where(
                Redemption.created_at <= datetime.combine(until, datetime.max.time())
            )
        query = query.order_by(Redemption.created_at.desc(), Redemption.id)
        return paginate(self.session, query, page, size)

    def expire_overdue(self, account_id: UUID, now: datetime) -> None:
        self.session.execute(
            update(Redemption)
            .where(
                Redemption.account_id == account_id,
                Redemption.status == "active",
                Redemption.expires_at < now,
            )
            .values(status="expired")
        )
        self.session.flush()
