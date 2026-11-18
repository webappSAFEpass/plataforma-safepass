import os
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from alembic import command
from app.core.database import get_db
from app.core.dependencies import get_identity, get_provider_catalog
from app.core.rate_limit import limiter
from app.integrations.local_identity import LocalIdentity
from app.integrations.local_provider_catalog import LocalProviderCatalog
from app.main import create_app


@pytest.fixture(scope="session")
def db_engine():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.fail("Defina TEST_DATABASE_URL para um PostgreSQL de testes separado.")
    parsed = make_url(url)
    if parsed.get_backend_name() != "postgresql" or not (parsed.database or "").endswith("_test"):
        pytest.fail("A suíte exige PostgreSQL e nome do banco terminado em _test.")
    # Apply versioned migrations to the dedicated test DB; never use create_all.
    from app.core.config import get_settings

    original = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = url
    get_settings.cache_clear()
    try:
        command.upgrade(Config("alembic.ini"), "head")
    finally:
        if original is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = original
        get_settings.cache_clear()
    engine = create_engine(url, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture
def db(db_engine) -> Iterator[Session]:
    with db_engine.connect() as connection:
        outer = connection.begin()
        session = Session(
            bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False
        )
        try:
            yield session
        finally:
            session.close()
            outer.rollback()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_identity] = LocalIdentity
    app.dependency_overrides[get_provider_catalog] = LocalProviderCatalog
    with TestClient(app) as client:
        yield client


class FixedClock:
    """Relógio fixo e avançável, usado pelos testes unitários do Desafio 01."""

    def __init__(self, now: datetime | None = None) -> None:
        self._now = now or datetime(2026, 11, 1, 12, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self._now

    def advance(self, delta) -> None:  # type: ignore[no-untyped-def]
        self._now += delta


class FakeUow:
    def __init__(self) -> None:
        self.commits = 0
        self.flushes = 0

    def commit(self) -> None:
        self.commits += 1

    def flush(self) -> None:
        self.flushes += 1


@pytest.fixture
def clock() -> FixedClock:
    return FixedClock()


@pytest.fixture
def uow() -> FakeUow:
    return FakeUow()


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    limiter.reset()
