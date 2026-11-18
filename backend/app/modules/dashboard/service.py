from app.core.exceptions import forbidden
from app.integrations.identity import Principal
from app.modules.alerts.service import AlertService
from app.modules.coupons.service import CouponService
from app.modules.dashboard import schemas as s
from app.modules.dependents.service import DependentService
from app.modules.points.service import PointsService

DASHBOARD_DEPENDENTS_LIMIT = 100  # display cap, not a business limit
DASHBOARD_ALERTS_LIMIT = 10
DASHBOARD_COUPONS_LIMIT = 10


class DashboardService:
    """Pure read aggregator: no business rules of its own (CLAUDE.md), only
    calls into the other modules' services and assembles their output."""

    def __init__(
        self,
        points: PointsService,
        dependents: DependentService,
        alerts: AlertService,
        coupons: CouponService,
    ):
        self.points = points
        self.dependents = dependents
        self.alerts = alerts
        self.coupons = coupons

    def view(self, actor: Principal) -> s.DashboardOut:
        if "dependent" in actor.roles:
            raise forbidden()

        account = self.points.account_for_manager(actor.user_id)
        balance = self.points.balance(actor)
        dependents_page = self.dependents.list(actor, page=1, size=DASHBOARD_DEPENDENTS_LIMIT)
        coupons_page = self.coupons.list_coupons(actor, page=1, size=DASHBOARD_COUPONS_LIMIT)

        for redemption, title in self.coupons.expiring_soon(account.id):
            message = f'Cupom "{title}" vence em {redemption.expires_at.date().isoformat()}.'
            self.alerts.ensure_expiration_alert(actor.user_id, message)

        alerts_page = self.alerts.list_alerts(actor, page=1, size=DASHBOARD_ALERTS_LIMIT)
        agenda = self.alerts.agenda(actor)

        return s.DashboardOut(
            account_id=account.id,
            plan_id=actor.plan_id,
            points_balance=balance.balance,
            dependents=dependents_page.items,
            alerts=alerts_page.items,
            agenda=agenda,
            active_coupons=[c for c in coupons_page.items if not c.locked],
        )
