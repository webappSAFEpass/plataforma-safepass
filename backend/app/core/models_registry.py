"""Importa todos os models para que `Base.metadata` fique completo (Alembic e testes).

Quando um squad adicionar módulo novo, registre o `models` dele aqui.
"""

from app.modules.alerts import models as alerts_models
from app.modules.auth import models as auth_models
from app.modules.companies import models as companies_models
from app.modules.coupons import models as coupons_models
from app.modules.dependents import models as dependents_models
from app.modules.marketplace import models as marketplace_models
from app.modules.plans import models as plans_models
from app.modules.platform_reviews import models as platform_reviews_models
from app.modules.points import models as points_models
from app.modules.providers import models as providers_models
from app.modules.referrals import models as referrals_models
from app.modules.reviews import models as reviews_models
from app.modules.subscriptions import models as subscriptions_models
from app.modules.users import models as users_models

__all__ = [
    "alerts_models",
    "auth_models",
    "companies_models",
    "coupons_models",
    "dependents_models",
    "marketplace_models",
    "plans_models",
    "platform_reviews_models",
    "points_models",
    "providers_models",
    "referrals_models",
    "reviews_models",
    "subscriptions_models",
    "users_models",
]
