from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.shared.models import Record


class Category(Record, Base):
    __tablename__ = "provider_categories"
    name: Mapped[str] = mapped_column(String(160), unique=True)
    active: Mapped[bool] = mapped_column(default=True)


class Tag(Record, Base):
    __tablename__ = "provider_tags"
    name: Mapped[str] = mapped_column(String(160), unique=True)
    active: Mapped[bool] = mapped_column(default=True)


class ServiceDefinition(Record, Base):
    __tablename__ = "service_definitions"
    category_id: Mapped[UUID] = mapped_column(ForeignKey("provider_categories.id"), index=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    description: Mapped[str] = mapped_column(String(2000), default="")
    active: Mapped[bool] = mapped_column(default=True)


class Provider(Record, Base):
    __tablename__ = "providers"
    __table_args__ = (
        CheckConstraint("status IN ('pending','approved','rejected')", name="provider_status"),
    )
    owner_user_id: Mapped[UUID] = mapped_column(index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(3000), default="")
    photo_url: Mapped[str | None] = mapped_column(String(2000))
    phone: Mapped[str | None] = mapped_column(String(32))
    contact_email: Mapped[str | None] = mapped_column(String(254))
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    reviewed_by: Mapped[UUID | None]
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_reason: Mapped[str | None] = mapped_column(String(1000))
    tag_links: Mapped[list[ProviderTag]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )

    @property
    def tag_ids(self) -> list[UUID]:
        return [link.tag_id for link in self.tag_links]


class ProviderTag(Record, Base):
    __tablename__ = "provider_tag_links"
    __table_args__ = (UniqueConstraint("provider_id", "tag_id"),)
    provider_id: Mapped[UUID] = mapped_column(ForeignKey("providers.id"), index=True)
    tag_id: Mapped[UUID] = mapped_column(ForeignKey("provider_tags.id"), index=True)


class ProviderService(Record, Base):
    __tablename__ = "provider_services"
    __table_args__ = (
        UniqueConstraint("provider_id", "service_id"),
        CheckConstraint(
            "(price IS NOT NULL AND price >= 0 AND min_price IS NULL AND max_price IS NULL)"
            " OR (price IS NULL AND min_price IS NOT NULL AND max_price IS NOT NULL"
            " AND min_price >= 0 AND max_price >= min_price)",
            name="provider_service_price",
        ),
    )
    provider_id: Mapped[UUID] = mapped_column(ForeignKey("providers.id"), index=True)
    service_id: Mapped[UUID] = mapped_column(ForeignKey("service_definitions.id"), index=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    min_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    max_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    active: Mapped[bool] = mapped_column(default=True)


class ServiceRequest(Record, Base):
    __tablename__ = "service_requests"
    __table_args__ = (
        CheckConstraint("status IN ('pending','approved','rejected')", name="request_status"),
        Index("ix_service_requests_queue", "status", "created_at"),
    )
    provider_id: Mapped[UUID] = mapped_column(ForeignKey("providers.id"), index=True)
    suggested_name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(2000), default="")
    status: Mapped[str] = mapped_column(String(16), default="pending")
    decided_by: Mapped[UUID | None]
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_reason: Mapped[str | None] = mapped_column(String(1000))
    service_id: Mapped[UUID | None] = mapped_column(ForeignKey("service_definitions.id"))


class Professional(Record, Base):
    __tablename__ = "professionals"
    created_by: Mapped[UUID]
    user_id: Mapped[UUID | None] = mapped_column(unique=True)
    name: Mapped[str] = mapped_column(String(160))
    registration: Mapped[str | None] = mapped_column(String(100))
    specialty: Mapped[str | None] = mapped_column(String(160))
    photo_url: Mapped[str | None] = mapped_column(String(2000))


class ProfessionalLink(Record, Base):
    __tablename__ = "provider_professionals"
    __table_args__ = (
        UniqueConstraint("provider_id", "professional_id"),
        CheckConstraint(
            "role IN ('manager','receptionist','professional')", name="professional_role"
        ),
    )
    provider_id: Mapped[UUID] = mapped_column(ForeignKey("providers.id"), index=True)
    professional_id: Mapped[UUID] = mapped_column(ForeignKey("professionals.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="professional")
    active: Mapped[bool] = mapped_column(default=True)
    professional: Mapped[Professional] = relationship(lazy="joined")
