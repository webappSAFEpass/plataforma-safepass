from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import EmailStr, Field, HttpUrl, model_validator

from app.shared.schemas import Input, Name, RecordOut

Money = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
Role = Literal["manager", "receptionist", "professional"]


class TaxonomyIn(Input):
    name: Name


class TaxonomyOut(RecordOut):
    name: str
    active: bool


class DefinitionIn(Input):
    category_id: UUID
    name: Name
    description: str = Field(default="", max_length=2000)


class DefinitionOut(TaxonomyOut):
    category_id: UUID
    description: str


class ProviderIn(Input):
    display_name: Name
    description: str = Field(default="", max_length=3000)
    photo_url: HttpUrl | None = None
    phone: str | None = Field(default=None, max_length=32)
    contact_email: EmailStr | None = None
    tag_ids: list[UUID] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def unique_tags(self) -> Self:
        if len(set(self.tag_ids)) != len(self.tag_ids):
            raise ValueError("Tags duplicadas.")
        return self


class ProviderPublic(RecordOut):
    display_name: str
    description: str
    photo_url: str | None
    phone: str | None
    contact_email: str | None
    tag_ids: list[UUID]


class ProviderOut(ProviderPublic):
    owner_user_id: UUID
    status: str
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    review_reason: str | None


class ReviewIn(Input):
    decision: Literal["approved", "rejected"]
    reason: str = Field(min_length=1, max_length=1000)


class PriceIn(Input):
    price: Money | None = None
    min_price: Money | None = None
    max_price: Money | None = None
    active: bool = True

    @model_validator(mode="after")
    def coherent_price(self) -> Self:
        fixed = self.price is not None and self.min_price is None and self.max_price is None
        ranged = (
            self.price is None
            and self.min_price is not None
            and self.max_price is not None
            and self.max_price >= self.min_price
        )
        if not (fixed or ranged):
            raise ValueError("Informe preço fixo OU faixa completa e ordenada.")
        return self


class ServiceIn(PriceIn):
    service_id: UUID


class ServiceOut(RecordOut):
    provider_id: UUID
    service_id: UUID
    price: Decimal | None
    min_price: Decimal | None
    max_price: Decimal | None
    active: bool


class RequestIn(Input):
    suggested_name: Name
    description: str = Field(default="", max_length=2000)


class RequestDecision(ReviewIn):
    service_id: UUID | None = None

    @model_validator(mode="after")
    def approval_target(self) -> Self:
        if (self.decision == "approved") != (self.service_id is not None):
            raise ValueError("Aprovação exige serviço de catálogo; rejeição não aceita serviço.")
        return self


class RequestOut(RecordOut):
    provider_id: UUID
    suggested_name: str
    description: str
    status: str
    decided_by: UUID | None
    decided_at: datetime | None
    decision_reason: str | None
    service_id: UUID | None


class ProfessionalIn(Input):
    name: Name
    user_id: UUID | None = None
    registration: str | None = Field(default=None, max_length=100)
    specialty: str | None = Field(default=None, max_length=160)
    photo_url: HttpUrl | None = None


class ProfessionalOut(RecordOut):
    user_id: UUID | None
    name: str
    registration: str | None
    specialty: str | None
    photo_url: str | None


class LinkIn(Input):
    professional_id: UUID
    role: Role = "professional"


class LinkPatch(Input):
    role: Role
    active: bool = True


class LinkOut(RecordOut):
    provider_id: UUID
    professional_id: UUID
    role: str
    active: bool
    professional: ProfessionalOut


class ProviderPatch(Input):
    display_name: Name | None = None
    description: str | None = Field(default=None, max_length=3000)
    photo_url: HttpUrl | None = None
    phone: str | None = Field(default=None, max_length=32)
    contact_email: EmailStr | None = None
    tag_ids: list[UUID] | None = Field(default=None, max_length=30)
