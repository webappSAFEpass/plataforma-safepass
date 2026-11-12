from uuid import UUID

from app.shared.schemas import Output


class ProviderCardOut(Output):
    id: UUID
    name: str
    category: str
    tags: list[str]
    price_tier: str | None
    image_url: str | None
    contact: str | None
    favorited: bool


class FavoriteOut(Output):
    provider_id: UUID
