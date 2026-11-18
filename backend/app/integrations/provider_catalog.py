"""Port for the provider catalog owned by Desafio 03 / squad-47.

Marketplace and reviews depend on provider identity and summary data but never
create a `providers` table, to avoid a second, diverging source of truth. The real
adapter is `app.modules.providers.catalog.ProviderCatalog` (Desafio 03), wired in
`app.core.dependencies.get_provider_catalog`.
"""

from typing import Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProviderSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    name: str = Field(max_length=160)
    category: str = Field(max_length=160)
    tags: list[str] = Field(default_factory=list)
    # `None` quando o prestador ainda não tem serviço com preço cadastrado.
    price_tier: str | None = Field(default=None, pattern=r"^(baixo|medio|alto)$")
    image_url: str | None = None
    contact: str | None = None


class ProviderCatalogGateway(Protocol):
    def search(
        self,
        query: str,
        category: str | None,
        price_tier: str | None,
        tags: list[str],
        page: int,
        size: int,
    ) -> tuple[list[ProviderSummary], int]: ...

    def get(self, provider_id: UUID) -> ProviderSummary | None: ...
