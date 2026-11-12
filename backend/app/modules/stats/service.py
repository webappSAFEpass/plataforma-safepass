from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from app.shared.roles import Role

if TYPE_CHECKING:
    from app.modules.users.repository import UserRepository


@dataclass(frozen=True)
class BenefitsTotals:
    benefits: int
    savings_cents: int


class BenefitsMetrics(Protocol):
    """Contrato com o Desafio 02 (resgates de cupons). Trocar o Null pela implementação real."""

    def totals(self) -> BenefitsTotals: ...


class NullBenefitsMetrics:
    def totals(self) -> BenefitsTotals:
        return BenefitsTotals(benefits=0, savings_cents=0)


@dataclass(frozen=True)
class PublicStats:
    active_users: int
    providers: int
    benefits: int
    savings_cents: int


class StatsService:
    def __init__(self, users: "UserRepository", benefits: BenefitsMetrics) -> None:
        self._users = users
        self._benefits = benefits

    def public_stats(self) -> PublicStats:
        totals = self._benefits.totals()
        return PublicStats(
            active_users=self._users.count_active_by_role(Role.USER),
            providers=self._users.count_active_by_role(Role.PROVIDER),
            benefits=totals.benefits,
            savings_cents=totals.savings_cents,
        )
