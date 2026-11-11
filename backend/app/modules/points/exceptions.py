from app.core.exceptions import DomainError


class InsufficientBalanceError(DomainError):
    def __init__(self) -> None:
        super().__init__("insufficient_balance", "Saldo de pontos insuficiente.", 409)
