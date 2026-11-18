from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal
from app.integrations.identity import Principal
from app.modules.coupons import schemas as s
from app.modules.coupons.repository import CouponRepository
from app.modules.coupons.service import CouponService
from app.modules.dependents.repository import DependentRepository
from app.modules.dependents.service import DependentService
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.shared.clock import SystemClock
from app.shared.schemas import Page

router = APIRouter(tags=["coupons"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(db: Session = Depends(get_db)) -> CouponService:
    points = PointsService(PointsRepository(db))
    dependents = DependentService(DependentRepository(db), points)
    return CouponService(CouponRepository(db), points, dependents, SystemClock())


Service = Annotated[CouponService, Depends(get_service)]


@router.get("/cupons", response_model=Page[s.CouponOut], summary="Cupons do plano e bloqueados")
def list_coupons(
    user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.CouponOut]:
    return service.list_coupons(user, page, size)


@router.post(
    "/cupons/{coupon_id}/resgates",
    response_model=s.RedemptionOut,
    status_code=201,
    summary="Resgata cupom e gera token",
)
def redeem(
    coupon_id: UUID,
    data: s.RedeemIn,
    user: User,
    service: Service,
    idempotency_key: Annotated[UUID | None, Header(alias="Idempotency-Key")] = None,
) -> s.RedemptionOut:
    return service.redeem(coupon_id, data, user, idempotency_key)


@router.get("/resgates", response_model=Page[s.RedemptionOut], summary="Histórico de resgates")
def history(
    user: User,
    service: Service,
    page: PageNumber = 1,
    size: PageSize = 20,
    status: str | None = Query(default=None, pattern=r"^(active|used|expired)$"),
    de: date | None = Query(default=None),
    ate: date | None = Query(default=None),
) -> Page[s.RedemptionOut]:
    return service.history(user, page, size, status, de, ate)


@router.post(
    "/resgates/{token}/utilizacao",
    response_model=s.RedemptionOut,
    summary="Marca o token como utilizado",
)
def use_token(token: str, user: User, service: Service) -> s.RedemptionOut:
    return service.use_token(token)
