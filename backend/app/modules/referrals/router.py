from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_optional_user, require_role
from app.core.rate_limit import rate_limit
from app.modules.referrals.repository import ReferralRepository
from app.modules.referrals.schemas import ReferralIn, ReferralOut, ReferralStatusIn
from app.modules.referrals.service import ReferralService
from app.shared.identity import CurrentUser
from app.shared.pagination import Page, PageParams, page_params
from app.shared.roles import Role

router = APIRouter(prefix="/referrals", tags=["referrals"])
admin_router = APIRouter(
    prefix="/admin/referrals", tags=["admin"], dependencies=[Depends(require_role(Role.ADMIN))]
)


def get_referral_service(db: Session = Depends(get_db)) -> ReferralService:
    return ReferralService(ReferralRepository(db), db)


@router.post(
    "",
    response_model=ReferralOut,
    status_code=status.HTTP_201_CREATED,
    summary="Indica um profissional para a plataforma",
    dependencies=[Depends(rate_limit("referral", limit=5, window_seconds=600))],
)
def create_referral(
    body: ReferralIn,
    user: CurrentUser | None = Depends(get_optional_user),
    service: ReferralService = Depends(get_referral_service),
) -> ReferralOut:
    referral = service.create(
        professional_name=body.professional_name,
        specialty=body.specialty,
        contact=body.contact,
        referrer_user_id=user.id if user else None,
    )
    return ReferralOut.model_validate(referral)


@admin_router.patch(
    "/{referral_id}",
    response_model=ReferralOut,
    summary="Atualiza o andamento de uma indicação",
)
def admin_update_referral_status(
    referral_id: UUID,
    body: ReferralStatusIn,
    service: ReferralService = Depends(get_referral_service),
) -> ReferralOut:
    referral = service.update_status(referral_id, body.status)
    return ReferralOut.model_validate(referral)


@admin_router.get("", response_model=Page[ReferralOut], summary="Lista indicações recebidas")
def admin_list_referrals(
    params: PageParams = Depends(page_params),
    service: ReferralService = Depends(get_referral_service),
) -> Page[ReferralOut]:
    items, total = service.list_page(offset=params.offset, limit=params.size)
    return Page[ReferralOut](
        items=[ReferralOut.model_validate(r) for r in items],
        total=total,
        page=params.page,
        size=params.size,
    )
