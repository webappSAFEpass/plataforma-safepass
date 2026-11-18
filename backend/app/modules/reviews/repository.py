from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.reviews.models import Review
from app.shared.pagination import paginate


class ReviewRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Review) -> None:
        self.session.add(record)
        self.session.flush()

    def list_for_provider(
        self, provider_id: UUID, page: int, size: int
    ) -> tuple[list[Review], int]:
        query = (
            select(Review)
            .where(Review.provider_id == provider_id)
            .order_by(Review.created_at.desc(), Review.id)
        )
        return paginate(self.session, query, page, size)

    def average_for_provider(self, provider_id: UUID) -> float | None:
        average = self.session.scalar(
            select(func.avg(Review.rating)).where(Review.provider_id == provider_id)
        )
        return float(average) if average is not None else None
