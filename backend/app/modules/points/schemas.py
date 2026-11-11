from uuid import UUID

from app.shared.schemas import RecordOut


class BalanceOut(RecordOut):
    manager_user_id: UUID
    balance: int


class TransactionOut(RecordOut):
    account_id: UUID
    type: str
    amount: int
    origin: str
    redemption_id: UUID | None
