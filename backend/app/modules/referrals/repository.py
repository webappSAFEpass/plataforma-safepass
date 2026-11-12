from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.referrals.models import Referral


class ReferralRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(
        self,
        *,
        professional_name: str,
        specialty: str | None,
        contact: str | None,
        referrer_user_id: UUID | None,
    ) -> Referral:
        referral = Referral(
            professional_name=professional_name,
            specialty=specialty or None,
            contact=contact or None,
            referrer_user_id=referrer_user_id,
        )
        self._db.add(referral)
        self._db.flush()
        return referral

    def get_by_id(self, referral_id: UUID) -> Referral | None:
        return self._db.get(Referral, referral_id)

    def update_status(self, referral: Referral, status: str) -> Referral:
        referral.status = status
        self._db.flush()
        return referral

    def list_page(self, *, offset: int, limit: int) -> tuple[Sequence[Referral], int]:
        items = self._db.scalars(
            select(Referral).order_by(Referral.created_at.desc()).offset(offset).limit(limit)
        ).all()
        total = self._db.scalar(select(func.count()).select_from(Referral)) or 0
        return items, total
