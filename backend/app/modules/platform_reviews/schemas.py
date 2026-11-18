from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.modules.platform_reviews.models import ReviewerProfile

AuthorName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
Comment = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
Reply = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class PlatformReviewIn(BaseModel):
    author_name: AuthorName
    reviewer_profile: ReviewerProfile
    rating: int = Field(ge=1, le=5)
    comment: Comment | None = None


class PlatformReviewPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_name: str
    reviewer_profile: ReviewerProfile
    rating: int
    comment: str | None
    created_at: datetime


class PlatformReviewAdminOut(PlatformReviewPublicOut):
    is_published: bool
    admin_reply: str | None
    replied_at: datetime | None


class ReplyIn(BaseModel):
    reply: Reply


class PublishIn(BaseModel):
    is_published: bool
