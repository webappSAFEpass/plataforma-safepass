from unittest.mock import Mock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.exceptions import DomainError
from app.integrations.identity import Principal
from app.integrations.local_provider_catalog import LocalProviderCatalog
from app.integrations.provider_catalog import ProviderSummary
from app.modules.marketplace.repository import FavoriteRepository
from app.modules.marketplace.service import MarketplaceService


def test_search_marks_items_already_favorited():
    actor = Principal(uuid4(), frozenset({"user"}))
    catalog = LocalProviderCatalog()
    first_id = catalog.search("", None, None, [], 1, 20)[0][0].id
    repo = Mock(spec=FavoriteRepository)
    repo.ids_for_user.return_value = {first_id}
    service = MarketplaceService(repo, catalog)

    page = service.search(actor, "", None, None, [], 1, 20)

    assert page.items[0].id == first_id
    assert page.items[0].favorited is True
    assert all(item.favorited is False for item in page.items[1:])


def test_search_without_filters_is_alphabetical():
    actor = Principal(uuid4(), frozenset({"user"}))
    catalog = LocalProviderCatalog()
    repo = Mock(spec=FavoriteRepository)
    repo.ids_for_user.return_value = set()
    service = MarketplaceService(repo, catalog)

    page = service.search(actor, "", None, None, [], 1, 20)

    names = [item.name for item in page.items]
    assert names == sorted(names)


def test_favorite_unknown_provider_raises_not_found():
    actor = Principal(uuid4(), frozenset({"user"}))
    repo = Mock(spec=FavoriteRepository)
    repo.get.return_value = None
    catalog = Mock()
    catalog.get.return_value = None
    service = MarketplaceService(repo, catalog)

    with pytest.raises(DomainError) as error:
        service.favorite(actor, uuid4())
    assert error.value.status_code == 404


def test_favorite_is_idempotent_for_already_favorited_provider():
    actor = Principal(uuid4(), frozenset({"user"}))
    repo = Mock(spec=FavoriteRepository)
    repo.get.return_value = object()
    catalog = Mock()
    service = MarketplaceService(repo, catalog)

    service.favorite(actor, uuid4())

    repo.add.assert_not_called()
    catalog.get.assert_not_called()


def test_provider_summary_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        ProviderSummary.model_validate(
            {
                "id": uuid4(),
                "name": "X",
                "category": "Y",
                "price_tier": "baixo",
                "unexpected": "field",
            }
        )
