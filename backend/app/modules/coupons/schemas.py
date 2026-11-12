from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.shared.schemas import Input, Name, RecordOut


class CouponIn(Input):
    title: Name
    description: str = Field(default="", max_length=2000)
    cost_points: int = Field(gt=0)
    provider_id: UUID | None = None
    plan_ids: list[UUID] = Field(default_factory=list, max_length=50)


class CouponOut(RecordOut):
    title: str
    description: str
    cost_points: int
    provider_id: UUID | None
    active: bool
    plan_ids: list[UUID]
    locked: bool


class RedeemIn(Input):
    beneficiary_id: UUID | None = None


class RedemptionOut(RecordOut):
    coupon_id: UUID
    account_id: UUID
    beneficiary_id: UUID | None
    token: str
    status: str
    points_debited: int
    expires_at: datetime
    used_at: datetime | None
