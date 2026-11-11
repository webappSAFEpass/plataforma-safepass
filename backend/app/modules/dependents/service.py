from uuid import UUID

from app.core.exceptions import forbidden
from app.integrations.identity import Principal
from app.modules.dependents import models as m
from app.modules.dependents import schemas as s
from app.modules.dependents.exceptions import DependentNotFound
from app.modules.dependents.repository import DependentRepository
from app.modules.points.service import PointsService
from app.shared.schemas import Page
from app.shared.transaction import commit


class DependentService:
    def __init__(self, repo: DependentRepository, points: PointsService):
        self.repo = repo
        self.points = points

    def require_manager(self, actor: Principal) -> None:
        if "dependent" in actor.roles:
            raise forbidden()

    def access(self, dependent_id: UUID, actor: Principal) -> m.Dependent:
        self.require_manager(actor)
        account = self.points.account_for_manager(actor.user_id)
        return self.get_in_account(dependent_id, account.id)

    def get_in_account(self, dependent_id: UUID, account_id: UUID) -> m.Dependent:
        dependent = self.repo.get(dependent_id)
        if dependent is None or dependent.account_id != account_id or not dependent.active:
            raise DependentNotFound()
        return dependent

    def context_for_dependent_actor(self, actor: Principal) -> m.Dependent:
        """Resolves which account a logged-in dependent belongs to."""
        dependent = self.repo.by_linked_user(actor.user_id)
        if dependent is None:
            raise forbidden()
        return dependent

    def create(self, data: s.DependentIn, actor: Principal) -> s.DependentOut:
        self.require_manager(actor)
        account = self.points.account_for_manager(actor.user_id)

        def action() -> s.DependentOut:
            record = m.Dependent(account_id=account.id, **data.model_dump())
            self.repo.add(record)
            return s.DependentOut.model_validate(record)

        return commit(self.repo.session, action)

    def list(self, actor: Principal, page: int, size: int) -> Page[s.DependentOut]:
        self.require_manager(actor)
        account = self.points.account_for_manager(actor.user_id)
        items, total = self.repo.list_for_account(account.id, page, size)
        return Page(
            items=[s.DependentOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def update(
        self, dependent_id: UUID, data: s.DependentPatch, actor: Principal
    ) -> s.DependentOut:
        def action() -> s.DependentOut:
            record = self.access(dependent_id, actor)
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(record, key, value)
            self.repo.add(record)
            return s.DependentOut.model_validate(record)

        return commit(self.repo.session, action)

    def remove(self, dependent_id: UUID, actor: Principal) -> None:
        self.update(dependent_id, s.DependentPatch(active=False), actor)
