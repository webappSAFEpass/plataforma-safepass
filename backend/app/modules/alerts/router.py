from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_principal
from app.integrations.identity import Principal
from app.modules.alerts import schemas as s
from app.modules.alerts.repository import AlertRepository
from app.modules.alerts.service import AlertService
from app.shared.clock import SystemClock
from app.shared.schemas import Page

router = APIRouter(prefix="/alertas", tags=["alerts"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(db: Session = Depends(get_db)) -> AlertService:
    return AlertService(AlertRepository(db), SystemClock())


Service = Annotated[AlertService, Depends(get_service)]


@router.get("", response_model=Page[s.AlertOut], summary="Lista alertas do usuário")
def list_alerts(
    user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.AlertOut]:
    return service.list_alerts(user, page, size)


@router.post("", response_model=s.AlertOut, status_code=201, summary="Cria alerta manual")
def create_alert(data: s.AlertIn, user: User, service: Service) -> s.AlertOut:
    return service.create_manual(data, user)
