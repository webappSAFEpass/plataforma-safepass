"""Ports for Squad 1. No users table, password or JWT implementation here."""

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from app.core.exceptions import unavailable


@dataclass(frozen=True)
class Principal:
    user_id: UUID
    roles: frozenset[str] = frozenset()
    # Desafio 1 owns plan assignment; until that integration exists this is
    # only ever populated by the local test identity. `None` means "plan
    # unknown" and plan-gated coupons must be treated as locked, never as
    # unlocked by default.
    plan_id: UUID | None = None

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles


class IdentityGateway(Protocol):
    def authenticate(self, credential: str) -> Principal: ...
    def require_user(self, user_id: UUID) -> None: ...


class UnconfiguredIdentity:
    def authenticate(self, credential: str) -> Principal:
        raise unavailable()

    def require_user(self, user_id: UUID) -> None:
        raise unavailable()
