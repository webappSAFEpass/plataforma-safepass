from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.plans.repository import PlanRepository
from app.modules.plans.schemas import AdminPlanOut, PlanOut, PlanUpdateIn
from app.modules.plans.service import PlanService
from app.shared.roles import Role

router = APIRouter(prefix="/plans", tags=["plans"])
admin_router = APIRouter(
    prefix="/admin/plans",
    tags=["admin"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


def get_plan_service(db: Session = Depends(get_db)) -> PlanService:
    return PlanService(PlanRepository(db), db)


@router.get("", response_model=list[PlanOut], summary="Lista os planos ativos (público)")
def list_plans(service: PlanService = Depends(get_plan_service)) -> list[PlanOut]:
    return [PlanOut.model_validate(plan) for plan in service.list_active()]


@admin_router.get(
    "", response_model=list[AdminPlanOut], summary="Lista todos os planos para administração"
)
def admin_list_plans(service: PlanService = Depends(get_plan_service)) -> list[AdminPlanOut]:
    return [AdminPlanOut.model_validate(plan) for plan in service.list_all_for_admin()]


@admin_router.patch(
    "/{code}",
    response_model=AdminPlanOut,
    summary="Atualiza os dados comerciais de um plano",
)
def admin_update_plan(
    code: str,
    body: PlanUpdateIn,
    service: PlanService = Depends(get_plan_service),
) -> AdminPlanOut:
    changes = body.model_dump(exclude_unset=True)
    plan = service.update_for_admin(code, changes)
    # A atualização persiste na mesma sessão do request.
    return AdminPlanOut.model_validate(plan)
