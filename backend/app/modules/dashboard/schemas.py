from uuid import UUID

from app.modules.alerts.schemas import AlertOut, ScheduleEventOut
from app.modules.coupons.schemas import CouponOut
from app.modules.dependents.schemas import DependentOut
from app.shared.schemas import Output


class DashboardOut(Output):
    account_id: UUID
    plan_id: UUID | None
    points_balance: int
    dependents: list[DependentOut]
    alerts: list[AlertOut]
    agenda: list[ScheduleEventOut]
    active_coupons: list[CouponOut]
