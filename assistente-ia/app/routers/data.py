"""API de dados consumida pelo assistente — paths do briefing, campos das tabelas reais do Supabase."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query

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
from app.deps import RepoDep, RulesDep, ScopeDep, SettingsDep, known_user
from app.services.search import filter_providers

router = APIRouter(tags=["dados"])

MAX_PROVIDERS_PAGE = 50

UserIdPath = Annotated[str, Path(pattern=USER_ID_PATTERN)]
UserIdQuery = Annotated[str, Query(pattern=USER_ID_PATTERN)]
FilterText = Annotated[str | None, Query(max_length=80)]


@router.get("/plans")
async def list_plans(_: ScopeDep, repo: RepoDep) -> list[Plan]:
    return await repo.list_plans()


@router.get("/account/{userId}")
async def get_account(userId: UserIdPath, scope: ScopeDep, repo: RepoDep) -> UserProfile:
    profile = await repo.get_user(scope.check(userId))
    if profile is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")
    return profile


@router.get("/dependents")
async def list_dependents(userId: UserIdQuery, scope: ScopeDep, repo: RepoDep) -> list[Dependent]:
    return await repo.list_dependents(await known_user(repo, scope, userId))


@router.get("/documents")
async def list_documents(
    userId: UserIdQuery,
    scope: ScopeDep,
    repo: RepoDep,
    settings: SettingsDep,
    rules: RulesDep,
    dependentId: Annotated[str | None, Query(pattern=TITULAR_ID_PATTERN)] = None,
) -> list[DocumentItem]:
    user_id = await known_user(repo, scope, userId)
    if dependentId and dependentId != user_id:
        family = {d.id for d in await repo.list_dependents(user_id)}
        if dependentId not in family:
            raise HTTPException(status_code=404, detail="dependente não encontrado")
    today = settings.today()
    dias_alerta = rules.documentos.dias_alerta_vencimento
    return [d.to_item(today, dias_alerta) for d in await repo.list_documents(user_id, dependentId or None)]


@router.get("/providers")
async def list_providers(
    _: ScopeDep,
    repo: RepoDep,
    rules: RulesDep,
    categoria: FilterText = None,
    especialidade: FilterText = None,
    cidade: FilterText = None,
    modalidade: Modalidade | None = None,
    limit: Annotated[int, Query(ge=1, le=MAX_PROVIDERS_PAGE)] = 20,
) -> list[Provider]:
    filters = ProviderFilters(categoria=categoria, especialidade=especialidade, cidade=cidade, modalidade=modalidade)
    found = filter_providers(await repo.list_providers(), filters, rules.busca_prestadores)
    return found[:limit]
