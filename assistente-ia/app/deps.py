"""Dependências FastAPI tipadas. Tudo vem de app.state (montado por create_app / lifespan)."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.assistant.llm import LLMClient
from app.config import Settings
from app.repos.base import Repository
from app.rules import BusinessRules
from app.security import ServiceScope, require_service_token
from app.services.ratelimit import SlidingWindowLimiter


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_repo(request: Request) -> Repository:
    repo: Repository = request.app.state.repo
    return repo


def get_llm(request: Request) -> LLMClient:
    llm: LLMClient = request.app.state.llm
    return llm


def get_rules(request: Request) -> BusinessRules:
    rules: BusinessRules = request.app.state.rules
    return rules


def get_chat_limiter(request: Request) -> SlidingWindowLimiter:
    limiter: SlidingWindowLimiter = request.app.state.chat_limiter
    return limiter


SettingsDep = Annotated[Settings, Depends(get_settings)]
RepoDep = Annotated[Repository, Depends(get_repo)]
LLMDep = Annotated[LLMClient, Depends(get_llm)]
RulesDep = Annotated[BusinessRules, Depends(get_rules)]
ChatLimiterDep = Annotated[SlidingWindowLimiter, Depends(get_chat_limiter)]
ScopeDep = Annotated[ServiceScope, Depends(require_service_token)]


async def known_user(repo: Repository, scope: ServiceScope, user_id: str) -> str:
    """Usuário dentro do escopo do token E existente; senão 404 (não revela qual dos dois)."""
    scope.check(user_id)
    if await repo.get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")
    return user_id
