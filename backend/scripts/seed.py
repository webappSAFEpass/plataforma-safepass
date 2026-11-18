"""Seed idempotente: planos, admin inicial e (opcional) depoimentos de demonstração.

Uso: python -m scripts.seed   (depois de `alembic upgrade head`)
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.plans.repository import PlanRepository
from app.modules.plans.seed import DEFAULT_PLANS
from app.modules.platform_reviews.models import PlatformReview
from app.modules.users.repository import UserRepository
from app.shared.roles import Role

# Depoimentos fictícios do protótipo, só para a demonstração (SEED_DEMO_DATA=true).
DEMO_REVIEWS = [
    ("Ana Lima", "user", 5, "Incrível! Economizei mais de R$300 em consultas só no primeiro mês."),
    (
        "Dr. Marcos Ferreira",
        "provider",
        5,
        "Minha clínica ganhou visibilidade enorme na plataforma.",
    ),
    (
        "TechCorp Brasília",
        "company",
        5,
        "Oferecemos o SAFEpass como benefício e a satisfação aumentou.",
    ),
    (
        "Juliana Souza",
        "user",
        4,
        "Facilidade para encontrar médicos perto de mim com valores acessíveis.",
    ),
    (
        "Clínica Saúde Total",
        "provider",
        5,
        "Gerenciar atestados e convênios ficou muito mais simples.",
    ),
    (
        "Ricardo Alves",
        "user",
        5,
        "O sistema de pontos é fantástico, já resgatei vários benefícios.",
    ),
    ("Grupo Inovação RH", "company", 4, "Solução perfeita para benefícios corporativos."),
    ("Dra. Carla Nunes", "provider", 5, "Os cupons exclusivos trouxeram muitos pacientes novos."),
    ("Paulo Henrique", "user", 5, "Cuida da saúde de toda minha família por um preço acessível."),
]


def seed_plans(db: Session) -> None:
    repo = PlanRepository(db)
    for plan in DEFAULT_PLANS:
        # Seed idempotente sem sobrescrever valores alterados pelo painel administrativo.
        if repo.get_by_code(plan["code"]) is None:
            repo.upsert_by_code(plan)


def seed_admin(db: Session, settings: Settings) -> None:
    if not settings.admin_email or not settings.admin_password:
        print("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: admin não criado.")
        return
    users = UserRepository(db)
    email = settings.admin_email.strip().lower()
    if users.get_by_email(email) is None:
        users.add(
            email=email,
            password_hash=hash_password(settings.admin_password),
            full_name="Administrador SAFEpass",
            role=Role.ADMIN,
        )
        print(f"Admin criado: {email}")


def seed_demo_reviews(db: Session) -> None:
    if (db.scalar(select(func.count()).select_from(PlatformReview)) or 0) > 0:
        return
    for name, profile, rating, comment in DEMO_REVIEWS:
        db.add(
            PlatformReview(
                author_name=name,
                reviewer_profile=profile,
                rating=rating,
                comment=comment,
                is_published=True,
            )
        )


def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        seed_plans(db)
        seed_admin(db, settings)
        if settings.seed_demo_data:
            seed_demo_reviews(db)
        db.commit()
    print("Seed concluído.")


if __name__ == "__main__":
    main()
