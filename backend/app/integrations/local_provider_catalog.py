"""Explicit local-development/test catalog. Never enabled by app.main.

A small fixed dataset standing in for Desafio 03's `providers` module, so
`marketplace` and `reviews` are exercisable before that module merges.
"""

from uuid import UUID

from app.integrations.provider_catalog import ProviderSummary

_CATALOG = [
    ProviderSummary(
        id=UUID("30000000-0000-0000-0000-000000000001"),
        name="Clínica Vet Vida",
        category="Veterinária",
        tags=["cães", "gatos"],
        price_tier="baixo",
        contact="(61) 99999-0001",
    ),
    ProviderSummary(
        id=UUID("30000000-0000-0000-0000-000000000002"),
        name="Dra. Paula Fisioterapia",
        category="Fisioterapia",
        tags=["idosos", "domiciliar"],
        price_tier="medio",
        contact="(61) 99999-0002",
    ),
    ProviderSummary(
        id=UUID("30000000-0000-0000-0000-000000000003"),
        name="Consultório Dr. André",
        category="Clínico Geral",
        tags=["adultos"],
        price_tier="alto",
        contact="(61) 99999-0003",
    ),
]


class LocalProviderCatalog:
    def search(
        self,
        query: str,
        category: str | None,
        price_tier: str | None,
        tags: list[str],
        page: int,
        size: int,
    ) -> tuple[list[ProviderSummary], int]:
        items = list(_CATALOG)
        if query:
            needle = query.lower()
            items = [p for p in items if needle in p.name.lower()]
        if category:
            items = [p for p in items if p.category == category]
        if price_tier:
            items = [p for p in items if p.price_tier == price_tier]
        if tags:
            items = [p for p in items if set(tags).issubset(set(p.tags))]
        items.sort(key=lambda p: p.name)
        total = len(items)
        start = (page - 1) * size
        return items[start : start + size], total

    def get(self, provider_id: UUID) -> ProviderSummary | None:
        return next((p for p in _CATALOG if p.id == provider_id), None)
