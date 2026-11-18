"""squad47 providers and companies

Revision ID: 66c8e1279f5c
Revises: 93b27d541c7e
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "66c8e1279f5c"
down_revision: str | None = "93b27d541c7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("responsible_user_id", sa.Uuid(), nullable=False),
        sa.Column("legal_name", sa.String(length=160), nullable=False),
        sa.Column("trade_name", sa.String(length=160), nullable=False),
        sa.Column("cnpj", sa.String(length=14), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cnpj"),
    )
    op.create_index(
        op.f("ix_companies_responsible_user_id"), "companies", ["responsible_user_id"], unique=False
    )
    op.create_table(
        "professionals",
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("registration", sa.String(length=100), nullable=True),
        sa.Column("specialty", sa.String(length=160), nullable=True),
        sa.Column("photo_url", sa.String(length=2000), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "provider_categories",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "provider_tags",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "providers",
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.String(length=3000), nullable=False),
        sa.Column("photo_url", sa.String(length=2000), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("contact_email", sa.String(length=254), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.String(length=1000), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="provider_status"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_providers_owner_user_id"), "providers", ["owner_user_id"], unique=False
    )
    op.create_index(op.f("ix_providers_status"), "providers", ["status"], unique=False)
    op.create_table(
        "company_employees",
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("employee_number", sa.String(length=60), nullable=True),
        sa.Column("department", sa.String(length=160), nullable=True),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('hr','employee')", name="employee_role"),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "user_id"),
    )
    op.create_index(
        op.f("ix_company_employees_active"), "company_employees", ["active"], unique=False
    )
    op.create_index(
        op.f("ix_company_employees_company_id"), "company_employees", ["company_id"], unique=False
    )
    op.create_index(
        op.f("ix_company_employees_user_id"), "company_employees", ["user_id"], unique=False
    )
    op.create_table(
        "provider_professionals",
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("professional_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "role IN ('manager','receptionist','professional')", name="professional_role"
        ),
        sa.ForeignKeyConstraint(
            ["professional_id"],
            ["professionals.id"],
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["providers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "professional_id"),
    )
    op.create_index(
        op.f("ix_provider_professionals_professional_id"),
        "provider_professionals",
        ["professional_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_provider_professionals_provider_id"),
        "provider_professionals",
        ["provider_id"],
        unique=False,
    )
    op.create_table(
        "provider_tag_links",
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["providers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["provider_tags.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "tag_id"),
    )
    op.create_index(
        op.f("ix_provider_tag_links_provider_id"),
        "provider_tag_links",
        ["provider_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_provider_tag_links_tag_id"), "provider_tag_links", ["tag_id"], unique=False
    )
    op.create_table(
        "service_definitions",
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["provider_categories.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(
        op.f("ix_service_definitions_category_id"),
        "service_definitions",
        ["category_id"],
        unique=False,
    )
    op.create_table(
        "provider_services",
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("min_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("max_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "(price IS NOT NULL AND price >= 0 AND min_price IS NULL AND max_price IS NULL) "
            "OR (price IS NULL AND min_price IS NOT NULL AND max_price IS NOT NULL "
            "AND min_price >= 0 AND max_price >= min_price)",
            name="provider_service_price",
        ),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["providers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["service_definitions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "service_id"),
    )
    op.create_index(
        op.f("ix_provider_services_provider_id"), "provider_services", ["provider_id"], unique=False
    )
    op.create_index(
        op.f("ix_provider_services_service_id"), "provider_services", ["service_id"], unique=False
    )
    op.create_table(
        "service_requests",
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("suggested_name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("decided_by", sa.Uuid(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.String(length=1000), nullable=True),
        sa.Column("service_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="request_status"),
        sa.ForeignKeyConstraint(
            ["provider_id"],
            ["providers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["service_definitions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_service_requests_provider_id"), "service_requests", ["provider_id"], unique=False
    )
    op.create_index(
        "ix_service_requests_queue", "service_requests", ["status", "created_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_service_requests_queue", table_name="service_requests")
    op.drop_index(op.f("ix_service_requests_provider_id"), table_name="service_requests")
    op.drop_table("service_requests")
    op.drop_index(op.f("ix_provider_services_service_id"), table_name="provider_services")
    op.drop_index(op.f("ix_provider_services_provider_id"), table_name="provider_services")
    op.drop_table("provider_services")
    op.drop_index(op.f("ix_service_definitions_category_id"), table_name="service_definitions")
    op.drop_table("service_definitions")
    op.drop_index(op.f("ix_provider_tag_links_tag_id"), table_name="provider_tag_links")
    op.drop_index(op.f("ix_provider_tag_links_provider_id"), table_name="provider_tag_links")
    op.drop_table("provider_tag_links")
    op.drop_index(
        op.f("ix_provider_professionals_provider_id"), table_name="provider_professionals"
    )
    op.drop_index(
        op.f("ix_provider_professionals_professional_id"), table_name="provider_professionals"
    )
    op.drop_table("provider_professionals")
    op.drop_index(op.f("ix_company_employees_user_id"), table_name="company_employees")
    op.drop_index(op.f("ix_company_employees_company_id"), table_name="company_employees")
    op.drop_index(op.f("ix_company_employees_active"), table_name="company_employees")
    op.drop_table("company_employees")
    op.drop_index(op.f("ix_providers_status"), table_name="providers")
    op.drop_index(op.f("ix_providers_owner_user_id"), table_name="providers")
    op.drop_table("providers")
    op.drop_table("provider_tags")
    op.drop_table("provider_categories")
    op.drop_table("professionals")
    op.drop_index(op.f("ix_companies_responsible_user_id"), table_name="companies")
    op.drop_table("companies")
