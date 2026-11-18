from typing import Protocol
from uuid import UUID

from app.modules.dependents.service import DependentService


class OwnershipCheck(Protocol):
    def require(self, user_id: UUID, dependent_id: UUID | None) -> None: ...


class DependentOwnership:
    """Garante que o dependente dono de um registro é da conta do usuário logado.

    `None` é o próprio usuário. Dependente de outra conta (ou inativo) → 404.
    """

    def __init__(self, dependents: DependentService) -> None:
        self.dependents = dependents

    def require(self, user_id: UUID, dependent_id: UUID | None) -> None:
        if dependent_id is None:
            return
        account = self.dependents.points.account_for_manager(user_id)
        self.dependents.get_in_account(dependent_id, account.id)
