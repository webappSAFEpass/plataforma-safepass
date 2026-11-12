from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
Optional120 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
Contact = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)]
ReferralStatus = Literal["new", "contacted", "registered", "rejected"]


class ReferralIn(BaseModel):
    professional_name: Name
    specialty: Optional120 | None = None
    contact: Contact | None = None


class ReferralStatusIn(BaseModel):
    status: ReferralStatus


class ReferralOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    professional_name: str
    specialty: str | None
    contact: str | None
    status: ReferralStatus
    created_at: datetime
