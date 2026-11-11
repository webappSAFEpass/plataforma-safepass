from typing import Any, overload

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException


class DomainError(Exception):
    """Erro de regra de negócio, convertido para HTTP pelo handler global.

    Dois estilos de uso convivem (herança dos squads 01, 02 e 03):

    - subclasse com `status_code`/`code`/`default_message` e `Erro()` ou `Erro("mensagem")`;
    - inline `DomainError("codigo", "mensagem", 422)`.
    """

    status_code: int = 400
    code: str = "domain_error"
    default_message: str = "Não foi possível concluir a operação."

    @overload
    def __init__(self, message: str | None = None, /) -> None: ...

    @overload
    def __init__(self, code: str, message: str, status_code: int = 422, /) -> None: ...

    def __init__(
        self,
        message_or_code: str | None = None,
        message: str | None = None,
        status_code: int | None = None,
        /,
    ) -> None:
        if message is None:
            self.message = message_or_code or self.default_message
        else:
            self.code = message_or_code or self.code
            self.message = message
            self.status_code = status_code if status_code is not None else 422
        super().__init__(self.message)


class NotFoundError(DomainError):
    status_code = 404
    code = "not_found"
    default_message = "Recurso não encontrado."


class ConflictError(DomainError):
    status_code = 409
    code = "conflict"
    default_message = "Conflito com o estado atual do recurso."


class UnauthorizedError(DomainError):
    status_code = 401
    code = "unauthorized"
    default_message = "Faça login para continuar."


class ForbiddenError(DomainError):
    status_code = 403
    code = "forbidden"
    default_message = "Você não tem permissão para esta ação."


class BusinessRuleError(DomainError):
    status_code = 422
    code = "business_rule_violation"
    default_message = "A operação viola uma regra de negócio."


class ServiceUnavailableError(DomainError):
    status_code = 503
    code = "integration_unavailable"
    default_message = "Integração ainda não configurada."


class TooManyRequestsError(DomainError):
    status_code = 429
    code = "too_many_requests"
    default_message = "Muitas tentativas. Aguarde um instante e tente novamente."


def error_body(
    code: str, message: str, details: list[dict[str, str]] | None = None
) -> dict[str, Any]:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return body


def register_exception_handlers(app: FastAPI) -> None:
    """Padroniza todos os erros no formato {"error": {"code", "message"}}."""

    @app.exception_handler(DomainError)
    async def handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": ".".join(str(part) for part in err["loc"][1:]), "message": str(err["msg"])}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_body("validation_error", "Dados inválidos.", details),
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_database_error(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        # Nunca expõe SQL, parâmetros ou detalhes do driver.
        return JSONResponse(
            status_code=503,
            content=error_body("database_unavailable", "Banco de dados indisponível."),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(f"http_{exc.status_code}", str(exc.detail)),
        )


# Atalhos usados pelos módulos dos desafios 02 e 03.
def missing() -> DomainError:
    return NotFoundError()


def forbidden() -> DomainError:
    return ForbiddenError()


def conflict(message: str) -> DomainError:
    return ConflictError(message)


def unavailable() -> DomainError:
    return ServiceUnavailableError()
