from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from app.modules.plans.exceptions import PlanNotFoundError
from app.shared.uow import UnitOfWork

if TYPE_CHECKING:
    from app.modules.plans.models import Plan
    from app.modules.plans.repository import PlanRepository


class PlanService:
    def __init__(self, repo: "PlanRepository", uow: UnitOfWork | None = None) -> None:
        self._repo = repo
        self._uow = uow

    def list_active(self) -> Sequence["Plan"]:
        return self._repo.list_active()

    def list_all_for_admin(self) -> Sequence["Plan"]:
        return self._repo.list_all()

    def get_by_code(self, code: str) -> "Plan":
        plan = self._repo.get_by_code(code)
        if plan is None or not plan.is_active:
            raise PlanNotFoundError()
        return plan

    def update_for_admin(self, code: str, changes: dict[str, Any]) -> "Plan":
        if self._uow is None:
            raise RuntimeError(
                "PlanService precisa de uma unidade de trabalho para gravar alterações."
            )
        plan = self._repo.get_by_code(code)
        if plan is None:
            raise PlanNotFoundError()
        updated = self._repo.update_fields(plan, changes)
        self._uow.commit()
        return updated
