from datetime import date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.points.models import ManagerAccount, PointTransaction
from app.shared.pagination import paginate


class PointsRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def get_by_manager(self, manager_user_id: UUID) -> ManagerAccount | None:
        return self.session.scalar(
            select(ManagerAccount).where(ManagerAccount.manager_user_id == manager_user_id)
        )

    def get_for_update(self, account_id: UUID) -> ManagerAccount | None:
        return self.session.scalar(
            select(ManagerAccount).where(ManagerAccount.id == account_id).with_for_update()
        )

    def transactions(
        self, account_id: UUID, page: int, size: int, since: date | None, until: date | None
    ) -> tuple[list[PointTransaction], int]:
        query = select(PointTransaction).where(PointTransaction.account_id == account_id)
        if since is not None:
            query = query.where(
                PointTransaction.created_at >= datetime.combine(since, datetime.min.time())
            )
        if until is not None:
            query = query.where(
                PointTransaction.created_at <= datetime.combine(until, datetime.max.time())
            )
        query = query.order_by(PointTransaction.created_at.desc(), PointTransaction.id)
        return paginate(self.session, query, page, size)
