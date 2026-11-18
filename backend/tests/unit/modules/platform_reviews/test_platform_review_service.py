from dataclasses import dataclass
from uuid import UUID, uuid4

import pytest

from app.modules.platform_reviews.exceptions import PlatformReviewNotFoundError
from app.modules.platform_reviews.service import PlatformReviewService


@dataclass
class FakeReview:
    id: UUID
    rating: int
    is_published: bool = False
    admin_reply: str | None = None
    replied_at: object = None
    replied_by: UUID | None = None


class FakeRepo:
    def __init__(self) -> None:
        self.items: dict[UUID, FakeReview] = {}

    def get(self, review_id: UUID) -> FakeReview | None:
        return self.items.get(review_id)

    def add(self, *, rating: int, **_: object) -> FakeReview:
        review = FakeReview(uuid4(), rating)
        self.items[review.id] = review
        return review


def _service(clock, uow):  # type: ignore[no-untyped-def]
    repo = FakeRepo()
    return PlatformReviewService(repo, uow, clock), repo  # type: ignore[arg-type]


def test_create_review_is_not_published_by_default_and_commits(clock, uow) -> None:  # type: ignore[no-untyped-def]
    service, _ = _service(clock, uow)
    review = service.create(
        author_name="Ana", reviewer_profile="visitor", rating=5, comment=None, user_id=None
    )
    assert review.is_published is False
    assert uow.commits == 1


def test_reply_stores_text_author_and_timestamp(clock, uow) -> None:  # type: ignore[no-untyped-def]
    service, repo = _service(clock, uow)
    review = repo.add(rating=3)
    admin_id = uuid4()

    updated = service.reply(review.id, reply="Obrigado pelo retorno!", admin_id=admin_id)

    assert updated.admin_reply == "Obrigado pelo retorno!"
    assert updated.replied_by == admin_id
    assert updated.replied_at == clock.now()


def test_reply_to_unknown_review_raises_not_found(clock, uow) -> None:  # type: ignore[no-untyped-def]
    service, _ = _service(clock, uow)
    with pytest.raises(PlatformReviewNotFoundError):
        service.reply(uuid4(), reply="oi", admin_id=uuid4())


def test_set_published_toggles_visibility(clock, uow) -> None:  # type: ignore[no-untyped-def]
    service, repo = _service(clock, uow)
    review = repo.add(rating=5)
    assert service.set_published(review.id, is_published=True).is_published is True
    assert service.set_published(review.id, is_published=False).is_published is False
