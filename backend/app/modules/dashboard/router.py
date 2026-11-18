from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal
from app.integrations.identity import Principal
from app.modules.alerts.repository import AlertRepository
from app.modules.alerts.service import AlertService
from app.modules.coupons.repository import CouponRepository
from app.modules.coupons.service import CouponService
from app.modules.dashboard import schemas as s
from app.modules.dashboard.service import DashboardService
from app.modules.dependents.repository import DependentRepository
from app.modules.dependents.service import DependentService
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.shared.clock import SystemClock

router = APIRouter(tags=["dashboard"])
User = Annotated[Principal, Depends(get_principal)]


def get_service(db: Session = Depends(get_db)) -> DashboardService:
    points = PointsService(PointsRepository(db))
    dependents = DependentService(DependentRepository(db), points)
    clock = SystemClock()
    alerts = AlertService(AlertRepository(db), clock)
    coupons = CouponService(CouponRepository(db), points, dependents, clock)
    return DashboardService(points, dependents, alerts, coupons)


Service = Annotated[DashboardService, Depends(get_service)]


@router.get("/dashboard", response_model=s.DashboardOut, summary="Visão consolidada")
def dashboard(user: User, service: Service) -> s.DashboardOut:
    return service.view(user)
