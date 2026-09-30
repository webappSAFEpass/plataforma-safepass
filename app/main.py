import logging
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.assistant.llm import LLMClient
from app.config import get_settings
from app.repos.memory import MemoryRepository
from app.routers import chat, data
from app.services.ratelimit import SlidingWindowLimiter

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("safepass")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if not settings.token_scopes():
        log.warning("SERVICE_TOKENS vazio: todas as rotas protegidas vão responder 401")
    if settings.database_url:
        from app.repos.postgres import PostgresRepository

        app.state.repo = await PostgresRepository.connect(settings.database_url)
        log.info("repositório: postgres")
    else:
        app.state.repo = MemoryRepository()
        log.info("repositório: memória (dados do protótipo)")
    app.state.chat_limiter = SlidingWindowLimiter(settings.chat_rate_per_min, 60.0)
    try:
        async with httpx.AsyncClient() as http:
            app.state.llm = LLMClient(settings, http)
            yield
    finally:
        await app.state.repo.close()


app = FastAPI(title="SAFEpass Backend", version="0.1.0", lifespan=lifespan)
app.include_router(data.router)
app.include_router(chat.router)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code, headers=exc.headers)


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
async def access_log(request: Request, call_next):
    # Só método, rota e status — nunca corpo, query string ou headers (PII / tokens).
    started = time.monotonic()
    response = await call_next(request)
    log.info("%s %s %d %dms", request.method, request.url.path, response.status_code,
             (time.monotonic() - started) * 1000)
    return response


@app.get("/health", include_in_schema=False)
async def health() -> dict:
    return {"ok": True}
