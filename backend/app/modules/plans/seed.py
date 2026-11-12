"""Planos iniciais (valores da landing). Edite aqui ou, futuramente, pelo painel admin."""

from typing import Any

FREE_PLAN_CODE = "free"

DEFAULT_PLANS: list[dict[str, Any]] = [
    {
        "code": FREE_PLAN_CODE,
        "name": "SAFEpass Free",
        "price_cents": 0,
        "tier": 0,
        "max_dependents": 2,
        "monthly_review_limit": 2,
        "points_multiplier": 1,
        "highlighted": False,
        "sort_order": 0,
        "features": [
            {"label": "Cadastro completo", "included": True},
            {"label": "Até 2 dependentes", "included": True},
            {"label": "2 avaliações liberadas por mês", "included": True},
            {"label": "Acesso limitado a cupons", "included": True},
            {"label": "Histórico de saúde digital", "included": False},
            {"label": "Cartão físico de benefícios", "included": False},
        ],
    },
    {
        "code": "aura",
        "name": "SAFEpass Aura",
        "price_cents": 4990,
        "tier": 1,
        "max_dependents": 5,
        "monthly_review_limit": 15,
        "points_multiplier": 2,
        "highlighted": True,
        "sort_order": 1,
        "features": [
            {"label": "Até 5 dependentes", "included": True},
            {"label": "15 avaliações liberadas por mês", "included": True},
            {"label": "Sua mensalidade vira pontos", "included": True},
            {"label": "Cupons exclusivos plano Aura", "included": True},
            {"label": "Histórico de saúde digital", "included": False},
            {"label": "Cartão físico de benefícios", "included": False},
        ],
    },
    {
        "code": "aura_plus",
        "name": "SAFEpass Aura+",
        "price_cents": 9700,
        "tier": 2,
        "max_dependents": None,
        "monthly_review_limit": None,
        "points_multiplier": 3,
        "highlighted": False,
        "sort_order": 2,
        "features": [
            {"label": "Dependentes ilimitados", "included": True},
            {"label": "Avaliações ilimitadas", "included": True},
            {"label": "Cupons exclusivos plano Aura+", "included": True},
            {"label": "Histórico de saúde digital", "included": True},
            {"label": "Cartão físico de benefícios", "included": True},
            {"label": "Check-up gratuito*", "included": True},
        ],
    },
]
