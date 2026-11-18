from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_identity, get_principal
from app.integrations.identity import IdentityGateway, Principal
from app.modules.providers import schemas as s
from app.modules.providers.repository import ProviderRepository
from app.modules.providers.service import ProviderService
from app.shared.schemas import Page

router = APIRouter(tags=["providers"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(
    db: Session = Depends(get_db), identity: IdentityGateway = Depends(get_identity)
) -> ProviderService:
    return ProviderService(ProviderRepository(db), identity)


Service = Annotated[ProviderService, Depends(get_service)]


@router.post(
    "/providers",
    response_model=s.ProviderOut,
    status_code=201,
    summary="Cadastrar prestador pendente",
)
def create(data: s.ProviderIn, user: User, service: Service) -> s.ProviderOut:
    return service.create(data, user)


@router.get("/providers", response_model=Page[s.ProviderPublic], summary="Listar perfis aprovados")
def public_list(
    service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.ProviderPublic] | Page[s.ProviderOut]:
    return service.list(None, page, size)


@router.get(
    "/provider-accounts",
    response_model=Page[s.ProviderOut],
    summary="Listar contextos administrativos acessíveis",
)
def account_list(
    user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.ProviderPublic] | Page[s.ProviderOut]:
    return service.list(user, page, size)


@router.get(
    "/providers/{provider_id}",
    response_model=s.ProviderPublic,
    summary="Consultar perfil público aprovado",
)
def public(provider_id: UUID, service: Service) -> s.ProviderPublic:
    return service.public(provider_id)


@router.get(
    "/providers/{provider_id}/profile",
    response_model=s.ProviderOut,
    summary="Consultar perfil administrativo",
)
def profile(provider_id: UUID, user: User, service: Service) -> s.ProviderOut:
    return service.get(provider_id, user)


@router.patch(
    "/providers/{provider_id}",
    response_model=s.ProviderOut,
    summary="Editar perfil e solicitar nova análise",
)
def update(provider_id: UUID, data: s.ProviderPatch, user: User, service: Service) -> s.ProviderOut:
    return service.update(provider_id, data, user)


@router.post(
    "/providers/{provider_id}/approval-decisions",
    response_model=s.ProviderOut,
    summary="Decidir aprovação cadastral (admin)",
)
def review(provider_id: UUID, data: s.ReviewIn, user: User, service: Service) -> s.ProviderOut:
    return service.review(provider_id, data, user)


@router.get(
    "/provider-categories", response_model=Page[s.TaxonomyOut], summary="Listar categorias ativas"
)
def categories(service: Service, page: PageNumber = 1, size: PageSize = 20) -> Page[s.TaxonomyOut]:
    return service.categories(page, size)


@router.post(
    "/provider-categories",
    response_model=s.TaxonomyOut,
    status_code=201,
    summary="Criar categoria (admin)",
)
def add_category(data: s.TaxonomyIn, user: User, service: Service) -> s.TaxonomyOut:
    return service.add_category(data, user)


@router.get("/provider-tags", response_model=Page[s.TaxonomyOut], summary="Listar tags ativas")
def tags(service: Service, page: PageNumber = 1, size: PageSize = 20) -> Page[s.TaxonomyOut]:
    return service.tags(page, size)


@router.post(
    "/provider-tags", response_model=s.TaxonomyOut, status_code=201, summary="Criar tag (admin)"
)
def add_tag(data: s.TaxonomyIn, user: User, service: Service) -> s.TaxonomyOut:
    return service.add_tag(data, user)


@router.get(
    "/service-definitions",
    response_model=Page[s.DefinitionOut],
    summary="Buscar catálogo de serviços",
)
def definitions(
    service: Service,
    page: PageNumber = 1,
    size: PageSize = 20,
    search: str = Query(default="", max_length=160),
) -> Page[s.DefinitionOut]:
    return service.definitions(page, size, search)


@router.post(
    "/service-definitions",
    response_model=s.DefinitionOut,
    status_code=201,
    summary="Criar serviço de catálogo (admin)",
)
def add_definition(data: s.DefinitionIn, user: User, service: Service) -> s.DefinitionOut:
    return service.add_definition(data, user)


@router.get(
    "/providers/{provider_id}/services",
    response_model=Page[s.ServiceOut],
    summary="Listar serviços e preços",
)
def services(
    provider_id: UUID, user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.ServiceOut]:
    return service.services(provider_id, user, page, size)


@router.post(
    "/providers/{provider_id}/services",
    response_model=s.ServiceOut,
    status_code=201,
    summary="Associar serviço e preço ao prestador",
)
def add_service(provider_id: UUID, data: s.ServiceIn, user: User, service: Service) -> s.ServiceOut:
    return service.add_service(provider_id, data, user)


@router.patch(
    "/providers/{provider_id}/services/{link_id}",
    response_model=s.ServiceOut,
    summary="Definir preço fixo ou faixa e disponibilidade",
)
def update_service(
    provider_id: UUID, link_id: UUID, data: s.PriceIn, user: User, service: Service
) -> s.ServiceOut:
    return service.update_service(provider_id, link_id, data, user)


@router.get(
    "/providers/{provider_id}/service-requests",
    response_model=Page[s.RequestOut],
    summary="Listar solicitações de catálogo",
)
def requests(
    provider_id: UUID, user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.RequestOut]:
    return service.requests(provider_id, user, page, size)


@router.post(
    "/providers/{provider_id}/service-requests",
    response_model=s.RequestOut,
    status_code=201,
    summary="Salvar solicitação pendente sem bloquear cadastro",
)
def request_service(
    provider_id: UUID, data: s.RequestIn, user: User, service: Service
) -> s.RequestOut:
    return service.request_service(provider_id, data, user)


@router.post(
    "/providers/{provider_id}/service-requests/{request_id}/decisions",
    response_model=s.RequestOut,
    summary="Analisar solicitação de serviço (admin)",
)
def decide_request(
    provider_id: UUID, request_id: UUID, data: s.RequestDecision, user: User, service: Service
) -> s.RequestOut:
    return service.decide_request(provider_id, request_id, data, user)


@router.post(
    "/providers/{provider_id}/professional-records",
    response_model=s.ProfessionalOut,
    status_code=201,
    summary="Cadastrar profissional sem duplicar identidade",
)
def create_professional(
    provider_id: UUID, data: s.ProfessionalIn, user: User, service: Service
) -> s.ProfessionalOut:
    return service.create_professional(provider_id, data, user)


@router.get(
    "/providers/{provider_id}/professionals",
    response_model=Page[s.LinkOut],
    summary="Listar vínculos profissionais",
)
def links(
    provider_id: UUID, user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.LinkOut]:
    return service.links(provider_id, user, page, size)


@router.post(
    "/providers/{provider_id}/professionals",
    response_model=s.LinkOut,
    status_code=201,
    summary="Vincular profissional à clínica",
)
def add_link(provider_id: UUID, data: s.LinkIn, user: User, service: Service) -> s.LinkOut:
    return service.add_link(provider_id, data, user)


@router.patch(
    "/providers/{provider_id}/professionals/{link_id}",
    response_model=s.LinkOut,
    summary="Alterar papel ou status do vínculo",
)
def update_link(
    provider_id: UUID, link_id: UUID, data: s.LinkPatch, user: User, service: Service
) -> s.LinkOut:
    return service.update_link(provider_id, link_id, data, user)


@router.delete(
    "/providers/{provider_id}/professionals/{link_id}",
    status_code=204,
    summary="Desativar vínculo sem apagar profissional",
)
def remove_link(provider_id: UUID, link_id: UUID, user: User, service: Service) -> Response:
    service.remove_link(provider_id, link_id, user)
    return Response(status_code=204)


@router.get(
    "/providers/{provider_id}/public-services",
    response_model=Page[s.ServiceOut],
    summary="Listar serviços ativos de prestador aprovado",
)
def public_services(
    provider_id: UUID, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.ServiceOut]:
    return service.public_services(provider_id, page, size)
