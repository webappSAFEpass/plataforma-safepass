from uuid import UUID

from app.core.exceptions import missing
from app.integrations.identity import Principal
from app.integrations.provider_catalog import ProviderCatalogGateway
from app.modules.marketplace import schemas as s
from app.modules.marketplace.models import Favorite
from app.modules.marketplace.repository import FavoriteRepository
from app.shared.schemas import Page
from app.shared.transaction import commit


class MarketplaceService:
    def __init__(self, repo: FavoriteRepository, catalog: ProviderCatalogGateway):
        self.repo = repo
        self.catalog = catalog

    def search(
        self,
        actor: Principal,
        query: str,
        category: str | None,
        price_tier: str | None,
        tags: list[str],
        page: int,
        size: int,
    ) -> Page[s.ProviderCardOut]:
        items, total = self.catalog.search(query, category, price_tier, tags, page, size)
        favorited_ids = self.repo.ids_for_user(actor.user_id)
        cards = [
            s.ProviderCardOut(
                id=p.id,
                name=p.name,
                category=p.category,
                tags=p.tags,
                price_tier=p.price_tier,
                image_url=p.image_url,
                contact=p.contact,
                favorited=p.id in favorited_ids,
            )
            for p in items
        ]
        return Page(items=cards, total=total, page=page, size=size)

    def profile(self, actor: Principal, provider_id: UUID) -> s.ProviderCardOut:
        provider = self.catalog.get(provider_id)
        if provider is None:
            raise missing()
        favorited = self.repo.get(actor.user_id, provider_id) is not None
        return s.ProviderCardOut(
            id=provider.id,
            name=provider.name,
            category=provider.category,
            tags=provider.tags,
            price_tier=provider.price_tier,
            image_url=provider.image_url,
            contact=provider.contact,
            favorited=favorited,
        )

    def favorites(self, actor: Principal, page: int, size: int) -> Page[s.FavoriteOut]:
        items, total = self.repo.list_for_user(actor.user_id, page, size)
        return Page(
            items=[s.FavoriteOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def favorite(self, actor: Principal, provider_id: UUID) -> None:
        if self.repo.get(actor.user_id, provider_id) is not None:
            return
        if self.catalog.get(provider_id) is None:
            raise missing()

        def action() -> None:
            self.repo.add(Favorite(user_id=actor.user_id, provider_id=provider_id))

        commit(self.repo.session, action)

    def unfavorite(self, actor: Principal, provider_id: UUID) -> None:
        favorite = self.repo.get(actor.user_id, provider_id)
        if favorite is None:
            return

        def action() -> None:
            self.repo.remove(favorite)

        commit(self.repo.session, action)
