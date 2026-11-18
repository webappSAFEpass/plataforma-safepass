from datetime import date
from uuid import UUID

from pydantic import Field

from app.shared.schemas import Input, Name, RecordOut


class DependentIn(Input):
    type: str = Field(pattern=r"^(person|pet)$")
    name: Name
    birth_date: date | None = None
    bond: str | None = Field(default=None, max_length=80)
    species: str | None = Field(default=None, max_length=80)
    linked_user_id: UUID | None = None


class DependentPatch(Input):
    name: Name | None = None
    birth_date: date | None = None
    bond: str | None = Field(default=None, max_length=80)
    species: str | None = Field(default=None, max_length=80)
    can_redeem_coupons: bool | None = None
    active: bool | None = None


class DependentOut(RecordOut):
    account_id: UUID
    type: str
    name: str
    birth_date: date | None
    bond: str | None
    species: str | None
    can_redeem_coupons: bool
    linked_user_id: UUID | None
    active: bool
