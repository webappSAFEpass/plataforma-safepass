import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import AsyncExitStack, asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.assistant.llm import LLMClient
from app.config import Settings
from app.deps import RepoDep
from app.observability import configure_logging, incoming_request_id, request_id
from app.repos.base import Repository
from app.repos.memory import MemoryRepository
from app.routers import chat, data
from app.rules import load_rules
from app.services.ratelimit import SlidingWindowLimiter

log = logging.getLogger("safepass")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    if not settings.token_scopes():
        log.warning("SERVICE_TOKENS vazio: todas as rotas protegidas vão responder 401")
    async with AsyncExitStack() as stack:
        repo: Repository
        if settings.database_url:
            from app.repos.postgres import PostgresRepository

            repo = await PostgresRepository.connect(settings.database_url)
            log.info("repositório: postgres")
        else:
            repo = MemoryRepository()
            log.info("repositório: memória (dados do protótipo)")
        stack.push_async_callback(repo.close)
        app.state.repo = repo
        http = await stack.enter_async_context(httpx.AsyncClient())
        app.state.llm = LLMClient(settings, http)
        app.state.chat_limiter = SlidingWindowLimiter(settings.chat_rate_per_min, 60.0)
        yield


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_json, settings.log_level)
    docs = settings.expose_docs
    app = FastAPI(
        title="SAFEpass Backend",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if docs else None,
    )
    app.state.settings = settings
    # Regras inválidas = o app não sobe: melhor o deploy falhar do que atender com regra quebrada.
    app.state.rules = load_rules(settings.regras_path)
    app.include_router(data.router, prefix=settings.api_prefix)
    app.include_router(chat.router, prefix=settings.api_prefix)
    _install_handlers(app)
    return app


def _route_template(request: Request) -> str:
    template = getattr(request.scope.get("route"), "path", None)
    if template is None:
        return "unmatched"
    prefix = request.app.state.settings.api_prefix
    # O router incluído guarda o template sem o prefixo; recoloca para o log ficar igual à URL.
    if prefix and request.url.path.startswith(prefix + "/") and not template.startswith(prefix):
        return f"{prefix}{template}"
    return str(template)


def _install_handlers(app: FastAPI) -> None:
    # StarletteHTTPException cobre também os 404/405 de rota inexistente: todo erro sai como {error}.
    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            {"error": str(exc.detail)}, status_code=exc.status_code, headers=getattr(exc, "headers", None)
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query", "path"))
        return JSONResponse({"error": f"parâmetro inválido: {field or 'requisição'}"}, status_code=422)

    @app.exception_handler(Exception)
    async def unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        # Só o tipo: a mensagem pode conter SQL, DSN ou dados pessoais.
        log.error("erro inesperado: %s", type(exc).__name__)
        return JSONResponse({"error": "erro interno"}, status_code=500)

    @app.middleware("http")
    async def access_log(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        rid = incoming_request_id(request.headers.get("x-request-id"))
        token = request_id.set(rid)
        started = time.monotonic()
        try:
            response = await call_next(request)
            # Template da rota ("/v1/account/{userId}"), nunca o path real: sem ids nem injeção de log.
            route = _route_template(request)
            # Em SSE mede até os headers; a duração total fica no log "chat/stream".
            log.info("%s %s %d %dms", request.method, route, response.status_code, (time.monotonic() - started) * 1000)
            response.headers["X-Request-ID"] = rid
            return response
        finally:
            request_id.reset(token)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/ready", include_in_schema=False)
    async def ready(repo: RepoDep) -> JSONResponse:
        """Readiness: o banco responde? (o /health só diz que o processo está vivo)."""
        try:
            await repo.list_plans()
        except Exception as exc:
            log.error("readiness falhou: %s", type(exc).__name__)
            return JSONResponse({"ok": False}, status_code=503)
        return JSONResponse({"ok": True})


app = create_app()
