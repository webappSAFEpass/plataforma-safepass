from collections.abc import Sequence
from typing import TYPE_CHECKING
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.shared.uow import UnitOfWork

if TYPE_CHECKING:
    from app.modules.referrals.models import Referral
    from app.modules.referrals.repository import ReferralRepository


class ReferralService:
    def __init__(self, repo: "ReferralRepository", uow: UnitOfWork) -> None:
        self._repo = repo
        self._uow = uow

    def create(
        self,
        *,
        professional_name: str,
        specialty: str | None,
        contact: str | None,
        referrer_user_id: UUID | None,
    ) -> "Referral":
        referral = self._repo.add(
            professional_name=professional_name,
            specialty=specialty,
            contact=contact,
            referrer_user_id=referrer_user_id,
        )
        self._uow.commit()
        return referral

    def update_status(self, referral_id: UUID, status: str) -> "Referral":
        referral = self._repo.get_by_id(referral_id)
        if referral is None:
            raise NotFoundError("Indicação não encontrada.")
        updated = self._repo.update_status(referral, status)
        self._uow.commit()
        return updated

    def list_page(self, *, offset: int, limit: int) -> tuple[Sequence["Referral"], int]:
        return self._repo.list_page(offset=offset, limit=limit)
