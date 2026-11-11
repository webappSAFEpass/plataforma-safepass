from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PlanFeature(BaseModel):
    label: str = Field(min_length=1, max_length=160)
    included: bool


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    price_cents: int
    tier: int
    max_dependents: int | None
    monthly_review_limit: int | None
    points_multiplier: int
    highlighted: bool
    features: list[PlanFeature]


class AdminPlanOut(PlanOut):
    sort_order: int
    is_active: bool


class PlanUpdateIn(BaseModel):
    """Campos administráveis do plano; `code` e `tier` são identificadores estáveis."""

    name: str | None = Field(default=None, min_length=2, max_length=60)
    price_cents: int | None = Field(default=None, ge=0, le=100_000_000)
    max_dependents: int | None = Field(default=None, ge=0, le=10_000)
    monthly_review_limit: int | None = Field(default=None, ge=0, le=100_000)
    points_multiplier: int | None = Field(default=None, ge=1, le=100)
    highlighted: bool | None = None
    features: list[PlanFeature] | None = Field(default=None, max_length=30)
    sort_order: int | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None

    @model_validator(mode="after")
    def reject_null_for_non_nullable_fields(self) -> "PlanUpdateIn":
        non_nullable = {
            "name",
            "price_cents",
            "points_multiplier",
            "highlighted",
            "features",
            "sort_order",
            "is_active",
        }
        for field in non_nullable & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"O campo '{field}' não pode ser nulo.")
        return self
