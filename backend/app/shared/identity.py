from dataclasses import dataclass
from uuid import UUID

from app.shared.roles import Role


@dataclass(frozen=True)
class CurrentUser:
    """Identidade autenticada, entregue por `get_current_user` a todos os módulos."""

    id: UUID
    role: Role
    email: str
    full_name: str
