"""Contrato do gateway de pagamento. O gateway real (Asaas, Mercado Pago...) ainda não foi
escolhido: quando for, basta implementar `PaymentGateway` e ligar em `build_gateway`.
O fluxo assíncrono (webhook → atualizar status) entrará junto com o adaptador real.
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol
from uuid import UUID, uuid4

from app.modules.subscriptions.models import SubscriptionStatus

if TYPE_CHECKING:
    from app.core.config import Settings


@dataclass(frozen=True)
class GatewayCharge:
    provider: str
    external_id: str | None
    status: SubscriptionStatus


class PaymentGateway(Protocol):
    def start_subscription(
        self, *, user_id: UUID, plan_code: str, amount_cents: int
    ) -> GatewayCharge: ...

    def cancel_subscription(self, external_id: str) -> None: ...


class SimulatedGateway:
    """Ativa na hora, sem cobrar nada. Somente para demonstração e testes."""

    provider = "simulated"

    def start_subscription(
        self, *, user_id: UUID, plan_code: str, amount_cents: int
    ) -> GatewayCharge:
        return GatewayCharge(
            provider=self.provider,
            external_id=f"sim_{uuid4().hex}",
            status=SubscriptionStatus.ACTIVE,
        )

    def cancel_subscription(self, external_id: str) -> None:
        return None


def build_gateway(settings: "Settings") -> PaymentGateway:
    # Único valor aceito hoje: "simulated" (validado em Settings).
    return SimulatedGateway()
