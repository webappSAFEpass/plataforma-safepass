"""Desafio 01: usuários, auth, planos, assinaturas, avaliações da plataforma e indicações.

Revision ID: d01_0001
Revises:
Create Date: 2026-10-28

ATENÇÃO (integração): se o repositório já tiver migrations de outros squads, ajuste
`down_revision` para encadear depois da última existente e evite múltiplos "heads".
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "d01_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _id() -> sa.Column:  # type: ignore[type-arg]
    return sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True)


def _timestamps() -> list[sa.Column]:  # type: ignore[type-arg]
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        _id(),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "role in ('user', 'dependent', 'provider', 'company', 'admin')", name="ck_users_role"
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "refresh_tokens",
        _id(),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    op.create_table(
        "password_reset_tokens",
        _id(),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        *_timestamps(),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])

    op.create_table(
        "plans",
        _id(),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("tier", sa.SmallInteger(), nullable=False),
        sa.Column("max_dependents", sa.Integer()),
        sa.Column("monthly_review_limit", sa.Integer()),
        sa.Column("points_multiplier", sa.SmallInteger(), server_default="1", nullable=False),
        sa.Column("highlighted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "features",
            postgresql.JSONB(),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("sort_order", sa.SmallInteger(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        *_timestamps(),
        sa.CheckConstraint("price_cents >= 0", name="ck_plans_price_non_negative"),
    )

    op.create_table(
        "subscriptions",
        _id(),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True)),
        sa.Column("canceled_at", sa.DateTime(timezone=True)),
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True)),
        sa.Column("gateway_provider", sa.String(30)),
        sa.Column("gateway_subscription_id", sa.String(100)),
        *_timestamps(),
        sa.CheckConstraint(
            "status in ('pending', 'active', 'past_due', 'canceled')",
            name="ck_subscriptions_status",
        ),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_plan_id", "subscriptions", ["plan_id"])
    op.create_index(
        "uq_subscriptions_one_active_per_user",
        "subscriptions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "platform_reviews",
        _id(),
        sa.Column("author_name", sa.String(120), nullable=False),
        sa.Column("reviewer_profile", sa.String(20), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("comment", sa.Text()),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("is_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("admin_reply", sa.Text()),
        sa.Column("replied_at", sa.DateTime(timezone=True)),
        sa.Column("replied_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        *_timestamps(),
        sa.CheckConstraint("rating between 1 and 5", name="ck_platform_reviews_rating_range"),
        sa.CheckConstraint(
            "reviewer_profile in ('visitor', 'user', 'provider', 'company')",
            name="ck_platform_reviews_reviewer_profile",
        ),
    )
    op.create_index("ix_platform_reviews_rating", "platform_reviews", ["rating"])
    op.create_index("ix_platform_reviews_user_id", "platform_reviews", ["user_id"])

    op.create_table(
        "referrals",
        _id(),
        sa.Column("professional_name", sa.String(120), nullable=False),
        sa.Column("specialty", sa.String(120)),
        sa.Column("contact", sa.String(160)),
        sa.Column("referrer_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(20), server_default="new", nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "status in ('new', 'contacted', 'registered', 'rejected')", name="ck_referrals_status"
        ),
    )
    op.create_index("ix_referrals_referrer_user_id", "referrals", ["referrer_user_id"])


def downgrade() -> None:
    for table in (
        "referrals",
        "platform_reviews",
        "subscriptions",
        "plans",
        "password_reset_tokens",
        "refresh_tokens",
        "users",
    ):
        op.drop_table(table)
