from datetime import date
from uuid import UUID

from app.core.exceptions import DomainError, forbidden, missing
from app.integrations.identity import Principal
from app.modules.points import models as m
from app.modules.points import schemas as s
from app.modules.points.exceptions import InsufficientBalanceError
from app.modules.points.repository import PointsRepository
from app.shared.schemas import Page
from app.shared.transaction import commit


class PointsService:
    """Points are an append-only ledger; `apply` never commits on its own so
    callers that need atomicity with another module's write (coupon
    redemption, review reward) can wrap both in a single `commit()`."""

    def __init__(self, repo: PointsRepository):
        self.repo = repo

    def account_for_manager(self, manager_user_id: UUID) -> m.ManagerAccount:
        """Lazily provisions the manager account on first use (Desafio 1 owns
        signup and gives us no explicit account-creation hook). Commits on
        its own: creation has no larger transaction to join."""
        account = self.repo.get_by_manager(manager_user_id)
        if account is not None:
            return account

        def action() -> m.ManagerAccount:
            created = m.ManagerAccount(manager_user_id=manager_user_id, balance=0)
            self.repo.add(created)
            return created

        return commit(self.repo.session, action)

    def require_manager(self, actor: Principal) -> None:
        if "dependent" in actor.roles:
            raise forbidden()

    def balance(self, actor: Principal) -> s.BalanceOut:
        self.require_manager(actor)
        account = self.account_for_manager(actor.user_id)
        return s.BalanceOut.model_validate(account)

    def statement(
        self, actor: Principal, page: int, size: int, since: date | None, until: date | None
    ) -> Page[s.TransactionOut]:
        self.require_manager(actor)
        account = self.account_for_manager(actor.user_id)
        items, total = self.repo.transactions(account.id, page, size, since, until)
        return Page(
            items=[s.TransactionOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def apply(
        self,
        account_id: UUID,
        type: str,
        amount: int,
        origin: str,
        redemption_id: UUID | None = None,
    ) -> m.PointTransaction:
        if amount <= 0:
            raise DomainError("invalid_amount", "O valor deve ser positivo.", 422)
        account = self.repo.get_for_update(account_id)
        if account is None:
            raise missing()
        if type == "debit":
            if account.balance < amount:
                raise InsufficientBalanceError()
            account.balance -= amount
        else:
            account.balance += amount
        transaction = m.PointTransaction(
            account_id=account_id,
            type=type,
            amount=amount,
            origin=origin,
            redemption_id=redemption_id,
        )
        self.repo.add(account)
        self.repo.add(transaction)
        return transaction
