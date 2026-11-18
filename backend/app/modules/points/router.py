from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal
from app.integrations.identity import Principal
from app.modules.points import schemas as s
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.shared.schemas import Page

router = APIRouter(prefix="/pontos", tags=["points"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(db: Session = Depends(get_db)) -> PointsService:
    return PointsService(PointsRepository(db))


Service = Annotated[PointsService, Depends(get_service)]


@router.get("/saldo", response_model=s.BalanceOut, summary="Saldo da conta gestora")
def balance(user: User, service: Service) -> s.BalanceOut:
    return service.balance(user)


@router.get("/extrato", response_model=Page[s.TransactionOut], summary="Extrato de movimentações")
def statement(
    user: User,
    service: Service,
    page: PageNumber = 1,
    size: PageSize = 20,
    de: date | None = Query(default=None),
    ate: date | None = Query(default=None),
) -> Page[s.TransactionOut]:
    return service.statement(user, page, size, de, ate)
