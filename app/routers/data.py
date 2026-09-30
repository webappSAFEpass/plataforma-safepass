"""API de dados consumida pelo assistente — paths do briefing, campos das tabelas reais do Supabase."""

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.config import Settings, get_settings
from app.contracts import (
    TITULAR_ID_PATTERN,
    USER_ID_PATTERN,
    Dependent,
    DocumentItem,
    Modalidade,
    Plan,
    Provider,
    ProviderFilters,
    UserProfile,
)
from app.repos.base import Repository
from app.security import ServiceScope, get_repo, require_service_token

router = APIRouter(tags=["dados"])

MAX_PROVIDERS_PAGE = 50


@router.get("/plans", response_model=list[Plan])
async def list_plans(
    _: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
) -> list[Plan]:
    return await repo.list_plans()


@router.get("/account/{userId}", response_model=UserProfile)
async def get_account(
    userId: str = Path(pattern=USER_ID_PATTERN),
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
) -> UserProfile:
    profile = await repo.get_user(scope.check(userId))
    if profile is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")
    return profile


@router.get("/dependents", response_model=list[Dependent])
async def list_dependents(
    userId: str = Query(pattern=USER_ID_PATTERN),
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
) -> list[Dependent]:
    user_id = scope.check(userId)
    if await repo.get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")
    return await repo.list_dependents(user_id)


@router.get("/documents", response_model=list[DocumentItem])
async def list_documents(
    userId: str = Query(pattern=USER_ID_PATTERN),
    dependentId: str | None = Query(default=None, pattern=TITULAR_ID_PATTERN),
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
    settings: Settings = Depends(get_settings),
) -> list[DocumentItem]:
    user_id = scope.check(userId)
    if await repo.get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")
    if dependentId and dependentId != user_id:
        family = {d.id for d in await repo.list_dependents(user_id)}
        if dependentId not in family:
            raise HTTPException(status_code=404, detail="dependente não encontrado")
    today = settings.today()
    return [d.to_item(today) for d in await repo.list_documents(user_id, dependentId or None)]


@router.get("/providers", response_model=list[Provider])
async def list_providers(
    categoria: str | None = Query(default=None, max_length=80),
    especialidade: str | None = Query(default=None, max_length=80),
    cidade: str | None = Query(default=None, max_length=80),
    modalidade: Modalidade | None = None,
    limit: int = Query(default=20, ge=1, le=MAX_PROVIDERS_PAGE),
    _: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
) -> list[Provider]:
    found = await repo.list_providers(ProviderFilters(
        categoria=categoria, especialidade=especialidade, cidade=cidade, modalidade=modalidade))
    return found[:limit]
