from uuid import UUID

from pydantic import Field

from app.shared.schemas import Input, Output, RecordOut


class ReviewIn(Input):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class ReviewOut(RecordOut):
    user_id: UUID
    provider_id: UUID
    rating: int
    comment: str
    provider_response: str | None


class ReviewPageOut(Output):
    items: list[ReviewOut]
    total: int
    page: int
    size: int
    average_rating: float | None
