from app.core.exceptions import BusinessRuleError, ConflictError


class AlreadySubscribedError(ConflictError):
    code = "already_subscribed"
    default_message = "Você já está neste plano."


class TermsNotAcceptedError(BusinessRuleError):
    code = "terms_not_accepted"
    default_message = "É necessário aceitar os Termos de Uso para contratar um plano pago."
