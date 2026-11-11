"""Proposed ports only. Owners must approve payloads before real adapters are wired.

No external domain tables or fake success responses are introduced by these ports.
Token consumption must be atomic/idempotent at the owning coupons service.
"""

from typing import Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.exceptions import unavailable


class Consumption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    redemption_id: UUID
    benefit_label: str = Field(max_length=160)
    # Intentionally excludes CPF, medical data and full patient profiles.


class CouponsGateway(Protocol):
    def consume(self, provider_id: UUID, token: str, idempotency_key: UUID) -> Consumption: ...


class ReviewsGateway(Protocol):
    def respond(self, provider_id: UUID, review_id: UUID, text: str) -> UUID: ...


class BenefitsGateway(Protocol):
    def active_benefit_ids(self, company_id: UUID) -> list[UUID]: ...


class DocumentsGateway(Protocol):
    def authorize_reference(self, company_id: UUID, user_id: UUID, document_id: UUID) -> None: ...


class ProfileSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: str = Field(max_length=3000)
    tag_ids: list[UUID] = Field(max_length=30)


class ProfileAIGateway(Protocol):
    def suggest(self, description: str, allowed_tag_ids: list[UUID]) -> ProfileSuggestion: ...


class UnconfiguredAdapters:
    """Fail closed; never silently substitute mocks in production."""

    def consume(self, provider_id: UUID, token: str, idempotency_key: UUID) -> Consumption:
        raise unavailable()

    def respond(self, provider_id: UUID, review_id: UUID, text: str) -> UUID:
        raise unavailable()

    def active_benefit_ids(self, company_id: UUID) -> list[UUID]:
        raise unavailable()

    def authorize_reference(self, company_id: UUID, user_id: UUID, document_id: UUID) -> None:
        raise unavailable()

    def suggest(self, description: str, allowed_tag_ids: list[UUID]) -> ProfileSuggestion:
        raise unavailable()
