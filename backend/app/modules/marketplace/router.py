from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal, get_provider_catalog
from app.integrations.identity import Principal
from app.integrations.provider_catalog import ProviderCatalogGateway
from app.modules.marketplace import schemas as s
from app.modules.marketplace.repository import FavoriteRepository
from app.modules.marketplace.service import MarketplaceService
from app.shared.schemas import Page

router = APIRouter(tags=["marketplace"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(
    db: Session = Depends(get_db), catalog: ProviderCatalogGateway = Depends(get_provider_catalog)
) -> MarketplaceService:
    return MarketplaceService(FavoriteRepository(db), catalog)


Service = Annotated[MarketplaceService, Depends(get_service)]


@router.get(
    "/prestadores",
    response_model=Page[s.ProviderCardOut],
    summary="Lista com filtros, ordenação e paginação",
)
def search(
    user: User,
    service: Service,
    page: PageNumber = 1,
    size: PageSize = 20,
    q: str = Query(default="", max_length=160),
    categoria: str | None = None,
    preco: str | None = Query(default=None, pattern=r"^(baixo|medio|alto)$"),
    tags: list[str] = Query(default=[]),
) -> Page[s.ProviderCardOut]:
    return service.search(user, q, categoria, preco, tags, page, size)


@router.get(
    "/prestadores/{provider_id}", response_model=s.ProviderCardOut, summary="Perfil do prestador"
)
def profile(provider_id: UUID, user: User, service: Service) -> s.ProviderCardOut:
    return service.profile(user, provider_id)


@router.get("/favoritos", response_model=Page[s.FavoriteOut], summary="Prestadores favoritos")
def favorites(
    user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.FavoriteOut]:
    return service.favorites(user, page, size)


@router.put("/favoritos/{provider_id}", status_code=204, summary="Favorita")
def favorite(provider_id: UUID, user: User, service: Service) -> Response:
    service.favorite(user, provider_id)
    return Response(status_code=204)


@router.delete("/favoritos/{provider_id}", status_code=204, summary="Remove favorito")
def unfavorite(provider_id: UUID, user: User, service: Service) -> Response:
    service.unfavorite(user, provider_id)
    return Response(status_code=204)
