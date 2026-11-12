from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.companies.models import Company, Employee
from app.shared.pagination import paginate


class CompanyRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def get(self, company_id: UUID) -> Company | None:
        return self.session.scalar(
            select(Company).where(Company.id == company_id).with_for_update()
        )

    def membership(self, company_id: UUID, user_id: UUID) -> Employee | None:
        return self.session.scalar(
            select(Employee).where(
                Employee.company_id == company_id,
                Employee.user_id == user_id,
                Employee.active,
                Employee.role == "hr",
            )
        )

    def companies(
        self, user_id: UUID, admin: bool, page: int, size: int
    ) -> tuple[list[Company], int]:
        query = select(Company).order_by(Company.legal_name, Company.id)
        if not admin:
            linked = select(Employee.company_id).where(
                Employee.user_id == user_id, Employee.active, Employee.role == "hr"
            )
            query = query.where(or_(Company.responsible_user_id == user_id, Company.id.in_(linked)))
        return paginate(self.session, query, page, size)

    def employee(self, company_id: UUID, employee_id: UUID) -> Employee | None:
        return self.session.scalar(
            select(Employee).where(Employee.company_id == company_id, Employee.id == employee_id)
        )

    def employees(
        self, company_id: UUID, page: int, size: int, search: str, active: bool | None
    ) -> tuple[list[Employee], int]:
        query = select(Employee).where(Employee.company_id == company_id)
        if active is not None:
            query = query.where(Employee.active == active)
        if search:
            query = query.where(
                or_(
                    Employee.department.icontains(search, autoescape=True),
                    Employee.employee_number.icontains(search, autoescape=True),
                )
            )
        return paginate(self.session, query.order_by(Employee.created_at, Employee.id), page, size)
