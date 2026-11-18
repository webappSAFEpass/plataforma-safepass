from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.modules.plans.repository import PlanRepository
from app.modules.subscriptions.gateway import build_gateway
from app.modules.subscriptions.repository import SubscriptionRepository
from app.modules.subscriptions.service import SubscriptionService
from app.shared.clock import SystemClock


def get_subscription_service(
    db: Session = Depends(get_db), settings: Settings = Depends(get_settings)
) -> SubscriptionService:
    """Montagem reutilizável por outros módulos (ex.: auth, dashboard do Desafio 02)."""
    return SubscriptionService(
        SubscriptionRepository(db), PlanRepository(db), build_gateway(settings), db, SystemClock()
    )
