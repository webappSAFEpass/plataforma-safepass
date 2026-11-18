from app.core.exceptions import BusinessRuleError, ConflictError, DomainError, UnauthorizedError


class EmailAlreadyRegisteredError(ConflictError):
    code = "email_already_registered"
    default_message = "Já existe uma conta com este e-mail."


class InvalidCredentialsError(UnauthorizedError):
    code = "invalid_credentials"
    default_message = "E-mail ou senha inválidos."


class InvalidRefreshTokenError(UnauthorizedError):
    code = "invalid_refresh_token"
    default_message = "Sessão expirada. Faça login novamente."


class InvalidResetTokenError(DomainError):
    status_code = 400
    code = "invalid_reset_token"
    default_message = "Link de recuperação inválido ou expirado."


class InvalidAccountTypeError(BusinessRuleError):
    code = "invalid_account_type"
    default_message = "Tipo de conta não permitido para cadastro."
