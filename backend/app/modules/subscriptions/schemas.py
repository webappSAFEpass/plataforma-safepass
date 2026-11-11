from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.modules.plans.schemas import PlanOut


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    started_at: datetime
    current_period_end: datetime | None
    # "simulated" enquanto o gateway real não estiver integrado.
    gateway_provider: str | None
    plan: PlanOut


class SubscribeIn(BaseModel):
    plan_code: str
    accept_terms: bool = False
