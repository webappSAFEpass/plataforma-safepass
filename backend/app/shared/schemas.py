from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Name = Annotated[str, Field(min_length=1, max_length=160)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RecordOut(Output):
    id: UUID
    created_at: datetime
    updated_at: datetime


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int
