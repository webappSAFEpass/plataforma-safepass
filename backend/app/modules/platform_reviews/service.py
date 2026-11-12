from collections.abc import Sequence
from typing import TYPE_CHECKING
from uuid import UUID

from app.modules.platform_reviews.exceptions import PlatformReviewNotFoundError
from app.shared.clock import Clock
from app.shared.uow import UnitOfWork

if TYPE_CHECKING:
    from app.modules.platform_reviews.models import PlatformReview
    from app.modules.platform_reviews.repository import PlatformReviewRepository

FEATURED_LIMIT = 9  # 3 por página x 3 páginas no carrossel da landing


class PlatformReviewService:
    def __init__(self, repo: "PlatformReviewRepository", uow: UnitOfWork, clock: Clock) -> None:
        self._repo = repo
        self._uow = uow
        self._clock = clock

    def create(
        self,
        *,
        author_name: str,
        reviewer_profile: str,
        rating: int,
        comment: str | None,
        user_id: UUID | None,
    ) -> "PlatformReview":
        review = self._repo.add(
            author_name=author_name,
            reviewer_profile=reviewer_profile,
            rating=rating,
            comment=comment,
            user_id=user_id,
        )
        self._uow.commit()
        return review

    def list_featured(self) -> Sequence["PlatformReview"]:
        return self._repo.list_published(FEATURED_LIMIT)

    def list_for_admin(
        self, *, rating: int | None, offset: int, limit: int
    ) -> tuple[Sequence["PlatformReview"], int]:
        return self._repo.list_filtered(rating=rating, offset=offset, limit=limit)

    def reply(self, review_id: UUID, *, reply: str, admin_id: UUID) -> "PlatformReview":
        review = self._get(review_id)
        review.admin_reply = reply
        review.replied_at = self._clock.now()
        review.replied_by = admin_id
        self._uow.commit()
        return review

    def set_published(self, review_id: UUID, *, is_published: bool) -> "PlatformReview":
        review = self._get(review_id)
        review.is_published = is_published
        self._uow.commit()
        return review

    def _get(self, review_id: UUID) -> "PlatformReview":
        review = self._repo.get(review_id)
        if review is None:
            raise PlatformReviewNotFoundError()
        return review
