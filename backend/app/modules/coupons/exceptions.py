from app.core.exceptions import DomainError


class CouponNotFound(DomainError):
    def __init__(self) -> None:
        super().__init__("not_found", "Cupom não encontrado.", 404)


class RedemptionNotFound(DomainError):
    def __init__(self) -> None:
        super().__init__("not_found", "Resgate não encontrado.", 404)


class CouponLockedError(DomainError):
    def __init__(self) -> None:
        super().__init__("coupon_locked", "Cupom não disponível para o seu plano.", 403)


class RedemptionNotActiveError(DomainError):
    def __init__(self) -> None:
        super().__init__("redemption_not_active", "Token já utilizado ou expirado.", 409)
