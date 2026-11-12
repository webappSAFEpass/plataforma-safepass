from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal, get_provider_catalog
from app.integrations.identity import Principal
from app.integrations.provider_catalog import ProviderCatalogGateway
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.modules.reviews import schemas as s
from app.modules.reviews.repository import ReviewRepository
from app.modules.reviews.service import ReviewService

router = APIRouter(tags=["reviews"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(
    db: Session = Depends(get_db), catalog: ProviderCatalogGateway = Depends(get_provider_catalog)
) -> ReviewService:
    return ReviewService(ReviewRepository(db), catalog, PointsService(PointsRepository(db)))


Service = Annotated[ReviewService, Depends(get_service)]


@router.get(
    "/prestadores/{provider_id}/avaliacoes",
    response_model=s.ReviewPageOut,
    summary="Avaliações e resumo",
)
def list_reviews(
    provider_id: UUID, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> s.ReviewPageOut:
    return service.list_for_provider(provider_id, page, size)


@router.post(
    "/prestadores/{provider_id}/avaliacoes",
    response_model=s.ReviewOut,
    status_code=201,
    summary="Registra avaliação e atualiza a média",
)
def create_review(provider_id: UUID, data: s.ReviewIn, user: User, service: Service) -> s.ReviewOut:
    return service.create(provider_id, data, user)
