from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.platform_reviews.models import PlatformReview


class PlatformReviewRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(
        self,
        *,
        author_name: str,
        reviewer_profile: str,
        rating: int,
        comment: str | None,
        user_id: UUID | None,
    ) -> PlatformReview:
        review = PlatformReview(
            author_name=author_name,
            reviewer_profile=reviewer_profile,
            rating=rating,
            comment=comment or None,
            user_id=user_id,
        )
        self._db.add(review)
        self._db.flush()
        return review

    def get(self, review_id: UUID) -> PlatformReview | None:
        return self._db.get(PlatformReview, review_id)

    def list_published(self, limit: int) -> Sequence[PlatformReview]:
        stmt = (
            select(PlatformReview)
            .where(PlatformReview.is_published.is_(True))
            .order_by(PlatformReview.created_at.desc())
            .limit(limit)
        )
        return self._db.scalars(stmt).all()

    def list_filtered(
        self, *, rating: int | None, offset: int, limit: int
    ) -> tuple[Sequence[PlatformReview], int]:
        stmt = select(PlatformReview)
        count_stmt = select(func.count()).select_from(PlatformReview)
        if rating is not None:
            stmt = stmt.where(PlatformReview.rating == rating)
            count_stmt = count_stmt.where(PlatformReview.rating == rating)
        items = self._db.scalars(
            stmt.order_by(PlatformReview.created_at.desc()).offset(offset).limit(limit)
        ).all()
        return items, self._db.scalar(count_stmt) or 0
