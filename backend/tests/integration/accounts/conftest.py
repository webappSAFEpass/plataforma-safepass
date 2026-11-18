"""Fluxos do Desafio 01 com autenticação real (JWT + cookies), sem `LocalIdentity`.

Usa o banco de testes migrado e a sessão com rollback da raiz (`db`), então nada vaza
entre testes.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.main import create_app
from app.modules.plans.repository import PlanRepository
from app.modules.plans.seed import DEFAULT_PLANS


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    repo = PlanRepository(db)
    for plan in DEFAULT_PLANS:
        repo.upsert_by_code(plan)
    db.flush()

    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
