"""Adapter do catálogo de prestadores consumido pelo marketplace e pelas avaliações (D02).

Só prestadores aprovados são visíveis. Os módulos do Desafio 02 dependem apenas do
protocolo `ProviderCatalogGateway`; esta classe é a implementação em processo.
"""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.integrations.provider_catalog import ProviderSummary
from app.modules.providers.models import Provider
from app.modules.providers.repository import (
    PRICE_TIER_HIGH_FROM,
    PRICE_TIER_MEDIUM_FROM,
    ProviderRepository,
)

UNCATEGORIZED = "Sem categoria"


def price_tier(average: Decimal | None) -> str | None:
    if average is None:
        return None
    if average < PRICE_TIER_MEDIUM_FROM:
        return "baixo"
    if average < PRICE_TIER_HIGH_FROM:
        return "medio"
    return "alto"


class ProviderCatalog:
    def __init__(self, session: Session) -> None:
        self._repo = ProviderRepository(session)

    def search(
        self,
        query: str,
        category: str | None,
        price_tier: str | None,
        tags: list[str],
        page: int,
        size: int,
    ) -> tuple[list[ProviderSummary], int]:
        providers, total = self._repo.search_approved(query, category, price_tier, tags, page, size)
        return self._summaries(providers), total

    def get(self, provider_id: UUID) -> ProviderSummary | None:
        provider = self._repo.get_approved(provider_id)
        return self._summaries([provider])[0] if provider else None

    def _summaries(self, providers: list[Provider]) -> list[ProviderSummary]:
        ids = [p.id for p in providers]
        if not ids:
            return []
        tags = self._repo.active_tag_names(ids)
        categories = self._repo.first_category_names(ids)
        averages = self._repo.average_prices(ids)
        return [
            ProviderSummary(
                id=p.id,
                name=p.display_name,
                category=categories.get(p.id, UNCATEGORIZED),
                tags=tags.get(p.id, []),
                price_tier=price_tier(averages.get(p.id)),
                image_url=p.photo_url,
                contact=p.phone or p.contact_email,
            )
            for p in providers
        ]
