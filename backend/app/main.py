from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import register_exception_handlers
from app.modules.alerts.router import router as alerts
from app.modules.auth.router import router as auth_router
from app.modules.companies.router import router as companies
from app.modules.coupons.router import router as coupons
from app.modules.dashboard.router import router as dashboard
from app.modules.dependents.router import router as dependents
from app.modules.marketplace.router import router as marketplace
from app.modules.plans.router import admin_router as plans_admin_router
from app.modules.plans.router import router as plans_router
from app.modules.platform_reviews.router import admin_router as platform_reviews_admin_router
from app.modules.platform_reviews.router import router as platform_reviews_router
from app.modules.points.router import router as points
from app.modules.providers.router import router as providers
from app.modules.referrals.router import admin_router as referrals_admin_router
from app.modules.referrals.router import router as referrals_router
from app.modules.reviews.router import router as reviews
from app.modules.stats.router import admin_router as stats_admin_router
from app.modules.stats.router import router as stats_router
from app.modules.subscriptions.router import router as subscriptions_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SAFEpass API",
        version="0.1.0",
        description=(
            "Backend integrado: identidade, planos e assinaturas (D01); marketplace, "
            "avaliações, pontos, cupons, dependentes, alertas e dashboard (D02); prestadores e"
            " empresas (D03)."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )

    @app.middleware("http")
    async def request_id(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Gerado internamente; não repete cabeçalhos não confiáveis nos logs.
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    register_exception_handlers(app)

    api_v1 = APIRouter(prefix="/api/v1")
    for router in (
        auth_router,
        plans_router,
        plans_admin_router,
        subscriptions_router,
        platform_reviews_router,
        platform_reviews_admin_router,
        referrals_router,
        referrals_admin_router,
        stats_router,
        stats_admin_router,
        dashboard,
        marketplace,
        reviews,
        points,
        coupons,
        dependents,
        alerts,
        providers,
        companies,
    ):
        api_v1.include_router(router)
    app.include_router(api_v1)

    @app.get("/health", summary="Verificar conexão com PostgreSQL", tags=["health"])
    def health(db: Session = Depends(get_db)) -> dict[str, str]:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}

    return app


app = create_app()
