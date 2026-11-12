from unittest.mock import Mock
from uuid import uuid4

import pytest

from app.core.exceptions import DomainError
from app.integrations.identity import Principal
from app.integrations.provider_catalog import ProviderSummary
from app.modules.points.models import ManagerAccount
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.modules.reviews.repository import ReviewRepository
from app.modules.reviews.schemas import ReviewIn
from app.modules.reviews.service import REVIEW_REWARD_POINTS, ReviewService
from tests.support import stamp_record


def _provider(provider_id) -> ProviderSummary:
    return ProviderSummary(
        id=provider_id, name="Clínica", category="Veterinária", price_tier="baixo"
    )


def _review_repo() -> Mock:
    repo = Mock(spec=ReviewRepository)
    repo.session = Mock()
    repo.add.side_effect = stamp_record
    return repo


def test_create_review_for_unknown_provider_raises_not_found():
    repo = _review_repo()
    catalog = Mock()
    catalog.get.return_value = None
    points = PointsService(Mock(spec=PointsRepository))
    service = ReviewService(repo, catalog, points)
    actor = Principal(uuid4(), frozenset({"user"}))

    with pytest.raises(DomainError) as error:
        service.create(uuid4(), ReviewIn(rating=5), actor)
    assert error.value.status_code == 404


def test_create_review_by_manager_credits_reward_points():
    provider_id = uuid4()
    manager_id = uuid4()
    repo = _review_repo()
    catalog = Mock()
    catalog.get.return_value = _provider(provider_id)
    account = ManagerAccount(id=uuid4(), manager_user_id=manager_id, balance=0)
    points_repo = Mock(spec=PointsRepository)
    points_repo.get_by_manager.return_value = account
    points_repo.get_for_update.return_value = account
    points = PointsService(points_repo)
    service = ReviewService(repo, catalog, points)
    actor = Principal(manager_id, frozenset({"user"}))

    service.create(provider_id, ReviewIn(rating=4, comment="Bom atendimento"), actor)

    assert account.balance == REVIEW_REWARD_POINTS


def test_create_review_by_dependent_does_not_touch_points():
    provider_id = uuid4()
    repo = _review_repo()
    catalog = Mock()
    catalog.get.return_value = _provider(provider_id)
    points_repo = Mock(spec=PointsRepository)
    points = PointsService(points_repo)
    service = ReviewService(repo, catalog, points)
    actor = Principal(uuid4(), frozenset({"dependent"}))

    service.create(provider_id, ReviewIn(rating=3), actor)

    points_repo.get_by_manager.assert_not_called()
    points_repo.get_for_update.assert_not_called()


def test_average_rating_is_none_without_reviews():
    repo = Mock(spec=ReviewRepository)
    repo.list_for_provider.return_value = ([], 0)
    repo.average_for_provider.return_value = None
    service = ReviewService(repo, Mock(), PointsService(Mock(spec=PointsRepository)))

    result = service.list_for_provider(uuid4(), page=1, size=20)

    assert result.average_rating is None
    assert result.total == 0
