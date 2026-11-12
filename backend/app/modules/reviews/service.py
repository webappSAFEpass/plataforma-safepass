from uuid import UUID

from app.core.exceptions import missing
from app.integrations.identity import Principal
from app.integrations.provider_catalog import ProviderCatalogGateway
from app.modules.points.service import PointsService
from app.modules.reviews import models as m
from app.modules.reviews import schemas as s
from app.modules.reviews.repository import ReviewRepository
from app.shared.transaction import commit

# Proposal: the PDF does not fix a reward value for a valid review; see docs/decisions.md.
REVIEW_REWARD_POINTS = 10


class ReviewService:
    def __init__(
        self, repo: ReviewRepository, catalog: ProviderCatalogGateway, points: PointsService
    ):
        self.repo = repo
        self.catalog = catalog
        self.points = points

    def create(self, provider_id: UUID, data: s.ReviewIn, actor: Principal) -> s.ReviewOut:
        if self.catalog.get(provider_id) is None:
            raise missing()

        account_id: UUID | None = None
        if "dependent" not in actor.roles:
            account_id = self.points.account_for_manager(actor.user_id).id

        def action() -> s.ReviewOut:
            review = m.Review(
                user_id=actor.user_id,
                provider_id=provider_id,
                rating=data.rating,
                comment=data.comment,
            )
            self.repo.add(review)
            if account_id is not None:
                self.points.apply(account_id, "credit", REVIEW_REWARD_POINTS, "Avaliação válida")
            return s.ReviewOut.model_validate(review)

        return commit(self.repo.session, action)

    def list_for_provider(self, provider_id: UUID, page: int, size: int) -> s.ReviewPageOut:
        items, total = self.repo.list_for_provider(provider_id, page, size)
        average = self.repo.average_for_provider(provider_id)
        return s.ReviewPageOut(
            items=[s.ReviewOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
            average_rating=average,
        )
