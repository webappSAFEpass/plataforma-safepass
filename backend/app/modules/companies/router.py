from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_identity, get_principal
from app.integrations.identity import IdentityGateway, Principal
from app.modules.companies import schemas as s
from app.modules.companies.repository import CompanyRepository
from app.modules.companies.service import CompanyService
from app.shared.schemas import Page

router = APIRouter(prefix="/companies", tags=["companies"])
User = Annotated[Principal, Depends(get_principal)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_service(
    db: Session = Depends(get_db), identity: IdentityGateway = Depends(get_identity)
) -> CompanyService:
    return CompanyService(CompanyRepository(db), identity)


Service = Annotated[CompanyService, Depends(get_service)]


@router.post("", response_model=s.CompanyOut, status_code=201, summary="Cadastrar empresa")
def create(data: s.CompanyIn, user: User, service: Service) -> s.CompanyOut:
    return service.create(data, user)


@router.get("", response_model=Page[s.CompanyOut], summary="Listar empresas administráveis")
def companies(
    user: User, service: Service, page: PageNumber = 1, size: PageSize = 20
) -> Page[s.CompanyOut]:
    return service.list(user, page, size)


@router.get("/{company_id}", response_model=s.CompanyOut, summary="Consultar cadastro empresarial")
def get(company_id: UUID, user: User, service: Service) -> s.CompanyOut:
    return service.get(company_id, user)


@router.patch("/{company_id}", response_model=s.CompanyOut, summary="Editar dados da empresa")
def update(company_id: UUID, data: s.CompanyPatch, user: User, service: Service) -> s.CompanyOut:
    return service.update(company_id, data, user)


@router.get(
    "/{company_id}/employees",
    response_model=Page[s.EmployeeOut],
    summary="Pesquisar vínculos por matrícula, departamento e status",
)
def employees(
    company_id: UUID,
    user: User,
    service: Service,
    page: PageNumber = 1,
    size: PageSize = 20,
    search: str = Query(default="", max_length=160),
    active: bool | None = None,
) -> Page[s.EmployeeOut]:
    return service.employees(company_id, user, page, size, search, active)


@router.post(
    "/{company_id}/employees",
    response_model=s.EmployeeOut,
    status_code=201,
    summary="Associar usuário existente como funcionário",
)
def add_employee(
    company_id: UUID, data: s.EmployeeIn, user: User, service: Service
) -> s.EmployeeOut:
    return service.add_employee(company_id, data, user)


@router.patch(
    "/{company_id}/employees/{employee_id}",
    response_model=s.EmployeeOut,
    summary="Editar ou reativar vínculo empresarial",
)
def update_employee(
    company_id: UUID, employee_id: UUID, data: s.EmployeePatch, user: User, service: Service
) -> s.EmployeeOut:
    return service.update_employee(company_id, employee_id, data, user)


@router.delete(
    "/{company_id}/employees/{employee_id}",
    status_code=204,
    summary="Desativar vínculo sem apagar usuário",
)
def remove_employee(company_id: UUID, employee_id: UUID, user: User, service: Service) -> Response:
    service.remove_employee(company_id, employee_id, user)
    return Response(status_code=204)
