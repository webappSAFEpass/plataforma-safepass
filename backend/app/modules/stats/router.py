from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.stats.admin_repository import AdminDashboardRepository
from app.modules.stats.admin_service import AdminDashboardService
from app.modules.stats.schemas import AdminDashboardOut, PublicStatsOut
from app.modules.stats.service import NullBenefitsMetrics, StatsService
from app.modules.users.repository import UserRepository
from app.shared.roles import Role

router = APIRouter(prefix="/stats", tags=["stats"])
admin_router = APIRouter(
    prefix="/admin/dashboard",
    tags=["admin"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


def get_stats_service(db: Session = Depends(get_db)) -> StatsService:
    return StatsService(UserRepository(db), NullBenefitsMetrics())


def get_admin_dashboard_service(db: Session = Depends(get_db)) -> AdminDashboardService:
    return AdminDashboardService(AdminDashboardRepository(db))


@router.get(
    "/public", response_model=PublicStatsOut, summary="Números da plataforma (faixa da landing)"
)
def public_stats(service: StatsService = Depends(get_stats_service)) -> PublicStatsOut:
    stats = service.public_stats()
    return PublicStatsOut(
        active_users=stats.active_users,
        providers=stats.providers,
        benefits=stats.benefits,
        savings_cents=stats.savings_cents,
    )


@admin_router.get(
    "",
    response_model=AdminDashboardOut,
    summary="Resumo de usuários, assinaturas, avaliações e indicações para o admin",
)
def admin_dashboard(
    service: AdminDashboardService = Depends(get_admin_dashboard_service),
) -> AdminDashboardOut:
    snapshot = service.snapshot()

    return AdminDashboardOut(
        active_users=snapshot.active_users,
        providers=snapshot.providers,
        companies=snapshot.companies,
        active_subscriptions=snapshot.active_subscriptions,
        total_reviews=snapshot.total_reviews,
        pending_reviews=snapshot.pending_reviews,
        total_referrals=snapshot.total_referrals,
        new_referrals=snapshot.new_referrals,
    )
