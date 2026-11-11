from uuid import UUID

from pydantic import ValidationError

from app.core.exceptions import DomainError, forbidden, missing
from app.integrations.identity import IdentityGateway, Principal
from app.modules.companies import models as m
from app.modules.companies import schemas as s
from app.modules.companies.exceptions import CompanyNotFound
from app.modules.companies.repository import CompanyRepository
from app.shared.schemas import Page
from app.shared.transaction import commit


class CompanyService:
    def __init__(self, repo: CompanyRepository, identity: IdentityGateway):
        self.repo = repo
        self.identity = identity

    def access(self, company_id: UUID, actor: Principal, manage: bool = False) -> m.Company:
        company = self.repo.get(company_id)
        if company is None:
            raise CompanyNotFound()
        if actor.is_admin or company.responsible_user_id == actor.user_id:
            return company
        link = self.repo.membership(company_id, actor.user_id)
        if link is None or (manage and link.role != "hr"):
            raise forbidden()
        return company

    def create(self, data: s.CompanyIn, actor: Principal) -> s.CompanyOut:
        if not actor.is_admin and "company" not in actor.roles:
            raise forbidden()

        def action() -> s.CompanyOut:
            record = m.Company(responsible_user_id=actor.user_id, **data.model_dump(mode="json"))
            self.repo.add(record)
            return s.CompanyOut.model_validate(record)

        return commit(self.repo.session, action)

    def get(self, company_id: UUID, actor: Principal) -> s.CompanyOut:
        return s.CompanyOut.model_validate(self.access(company_id, actor, manage=True))

    def list(self, actor: Principal, page: int, size: int) -> Page[s.CompanyOut]:
        items, total = self.repo.companies(actor.user_id, actor.is_admin, page, size)
        return Page(
            items=[s.CompanyOut.model_validate(i) for i in items], total=total, page=page, size=size
        )

    def update(self, company_id: UUID, data: s.CompanyPatch, actor: Principal) -> s.CompanyOut:
        def action() -> s.CompanyOut:
            company = self.access(company_id, actor, manage=True)
            current = s.CompanyOut.model_validate(company).model_dump()
            try:
                merged = s.CompanyIn.model_validate(
                    {
                        key: data.model_dump(exclude_unset=True).get(key, current[key])
                        for key in s.CompanyIn.model_fields
                    }
                )
            except ValidationError as exc:
                raise DomainError("invalid_company", "Dados da empresa inválidos.") from exc
            for key, value in merged.model_dump(mode="json").items():
                setattr(company, key, value)
            self.repo.add(company)
            return s.CompanyOut.model_validate(company)

        return commit(self.repo.session, action)

    def employees(
        self,
        company_id: UUID,
        actor: Principal,
        page: int,
        size: int,
        search: str,
        active: bool | None,
    ) -> Page[s.EmployeeOut]:
        self.access(company_id, actor, manage=True)
        items, total = self.repo.employees(company_id, page, size, search, active)
        return Page(
            items=[s.EmployeeOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def add_employee(self, company_id: UUID, data: s.EmployeeIn, actor: Principal) -> s.EmployeeOut:
        def action() -> s.EmployeeOut:
            company = self.access(company_id, actor, manage=True)
            if (
                data.role == "hr"
                and not actor.is_admin
                and company.responsible_user_id != actor.user_id
            ):
                raise forbidden()
            self.identity.require_user(data.user_id)
            record = m.Employee(company_id=company_id, **data.model_dump())
            self.repo.add(record)
            return s.EmployeeOut.model_validate(record)

        return commit(self.repo.session, action)

    def update_employee(
        self, company_id: UUID, employee_id: UUID, data: s.EmployeePatch, actor: Principal
    ) -> s.EmployeeOut:
        def action() -> s.EmployeeOut:
            company = self.access(company_id, actor, manage=True)
            record = self.repo.employee(company_id, employee_id)
            if record is None:
                raise missing()
            if (
                record.role == "hr"
                and not actor.is_admin
                and company.responsible_user_id != actor.user_id
            ):
                raise forbidden()
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(record, key, value)
            self.repo.add(record)
            return s.EmployeeOut.model_validate(record)

        return commit(self.repo.session, action)

    def remove_employee(self, company_id: UUID, employee_id: UUID, actor: Principal) -> None:
        self.update_employee(company_id, employee_id, s.EmployeePatch(active=False), actor)
