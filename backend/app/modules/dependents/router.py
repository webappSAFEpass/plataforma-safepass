from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal
from app.integrations.identity import Principal
from app.modules.dependents import schemas as s
from app.modules.dependents.repository import DependentRepository
from app.modules.dependents.service import DependentService
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.shared.schemas import Page

router = APIRouter(prefix="/dependentes", tags=["dependents"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(db: Session = Depends(get_db)) -> DependentService:
    return DependentService(DependentRepository(db), PointsService(PointsRepository(db)))


Service = Annotated[DependentService, Depends(get_service)]


@router.get("", response_model=Page[s.DependentOut], summary="Listar dependentes da conta")
def list_dependents(
    user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.DependentOut]:
    return service.list(user, page, size)


@router.post("", response_model=s.DependentOut, status_code=201, summary="Cadastrar dependente")
def create(data: s.DependentIn, user: User, service: Service) -> s.DependentOut:
    return service.create(data, user)


@router.patch(
    "/{dependent_id}",
    response_model=s.DependentOut,
    summary="Editar dados e permissão de resgate do dependente",
)
def update(
    dependent_id: UUID, data: s.DependentPatch, user: User, service: Service
) -> s.DependentOut:
    return service.update(dependent_id, data, user)


@router.delete("/{dependent_id}", status_code=204, summary="Remover dependente (lógico)")
def remove(dependent_id: UUID, user: User, service: Service) -> Response:
    service.remove(dependent_id, user)
    return Response(status_code=204)
