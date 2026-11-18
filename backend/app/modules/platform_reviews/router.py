from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_optional_user, require_role
from app.core.rate_limit import rate_limit
from app.modules.platform_reviews.repository import PlatformReviewRepository
from app.modules.platform_reviews.schemas import (
    PlatformReviewAdminOut,
    PlatformReviewIn,
    PlatformReviewPublicOut,
    PublishIn,
    ReplyIn,
)
from app.modules.platform_reviews.service import PlatformReviewService
from app.shared.clock import SystemClock
from app.shared.identity import CurrentUser
from app.shared.pagination import Page, PageParams, page_params
from app.shared.roles import Role

router = APIRouter(prefix="/platform-reviews", tags=["platform-reviews"])
admin_router = APIRouter(
    prefix="/admin/platform-reviews",
    tags=["admin"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


def get_platform_review_service(db: Session = Depends(get_db)) -> PlatformReviewService:
    return PlatformReviewService(PlatformReviewRepository(db), db, SystemClock())


@router.post(
    "",
    response_model=PlatformReviewPublicOut,
    status_code=status.HTTP_201_CREATED,
    summary="Envia uma avaliação da plataforma (visitantes também podem)",
    dependencies=[Depends(rate_limit("platform-review", limit=5, window_seconds=600))],
)
def create_review(
    body: PlatformReviewIn,
    user: CurrentUser | None = Depends(get_optional_user),
    service: PlatformReviewService = Depends(get_platform_review_service),
) -> PlatformReviewPublicOut:
    review = service.create(
        author_name=body.author_name,
        reviewer_profile=body.reviewer_profile.value,
        rating=body.rating,
        comment=body.comment,
        user_id=user.id if user else None,
    )
    return PlatformReviewPublicOut.model_validate(review)


@router.get(
    "/featured",
    response_model=list[PlatformReviewPublicOut],
    summary="Depoimentos publicados (até 9) para a landing",
)
def list_featured(
    service: PlatformReviewService = Depends(get_platform_review_service),
) -> list[PlatformReviewPublicOut]:
    return [PlatformReviewPublicOut.model_validate(r) for r in service.list_featured()]


@admin_router.get(
    "",
    response_model=Page[PlatformReviewAdminOut],
    summary="Lista avaliações, com filtro por número de estrelas",
)
def admin_list_reviews(
    rating: int | None = Query(default=None, ge=1, le=5),
    params: PageParams = Depends(page_params),
    service: PlatformReviewService = Depends(get_platform_review_service),
) -> Page[PlatformReviewAdminOut]:
    items, total = service.list_for_admin(rating=rating, offset=params.offset, limit=params.size)
    return Page[PlatformReviewAdminOut](
        items=[PlatformReviewAdminOut.model_validate(r) for r in items],
        total=total,
        page=params.page,
        size=params.size,
    )


@admin_router.post(
    "/{review_id}/reply",
    response_model=PlatformReviewAdminOut,
    summary="Responde uma avaliação",
)
def admin_reply(
    review_id: UUID,
    body: ReplyIn,
    admin: CurrentUser = Depends(require_role(Role.ADMIN)),
    service: PlatformReviewService = Depends(get_platform_review_service),
) -> PlatformReviewAdminOut:
    review = service.reply(review_id, reply=body.reply, admin_id=admin.id)
    return PlatformReviewAdminOut.model_validate(review)


@admin_router.patch(
    "/{review_id}",
    response_model=PlatformReviewAdminOut,
    summary="Publica ou despublica uma avaliação na landing",
)
def admin_set_published(
    review_id: UUID,
    body: PublishIn,
    service: PlatformReviewService = Depends(get_platform_review_service),
) -> PlatformReviewAdminOut:
    review = service.set_published(review_id, is_published=body.is_published)
    return PlatformReviewAdminOut.model_validate(review)
