from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.dependents.models import Dependent
from app.shared.pagination import paginate


class DependentRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def get(self, dependent_id: UUID) -> Dependent | None:
        return self.session.scalar(select(Dependent).where(Dependent.id == dependent_id))

    def by_linked_user(self, user_id: UUID) -> Dependent | None:
        return self.session.scalar(
            select(Dependent).where(Dependent.linked_user_id == user_id, Dependent.active)
        )

    def list_for_account(
        self, account_id: UUID, page: int, size: int
    ) -> tuple[list[Dependent], int]:
        query = (
            select(Dependent)
            .where(Dependent.account_id == account_id)
            .order_by(Dependent.name, Dependent.id)
        )
        return paginate(self.session, query, page, size)
