"""Histórico médico (Desafio 04) com autenticação real (JWT em cookie), OCR e disco falsos."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.integrations.prescription_ocr import ExtractedItem, Extraction, ReadResult
from app.main import create_app
from app.modules.documents.router import get_prescription_reader, get_storage
from app.modules.documents.storage import LocalFileStorage
from app.modules.plans.repository import PlanRepository
from app.modules.plans.seed import DEFAULT_PLANS

PASSWORD = "Senha123"


class FakeReader:
    def read(self, image: bytes, mime_type: str) -> ReadResult:
        return ReadResult(
            data=Extraction(
                medications=[
                    ExtractedItem(
                        name="Amoxicilina",
                        dose="500mg",
                        posology="8/8h",
                        period="7 dias",
                        confidence=0.95,
                    )
                ],
                overall_confidence=0.95,
                doctor="Dra. Ana Lima",
                prescription_date="2026-11-10",
            ),
            needs_review=False,
            review_fields=[],
            source="gemini",
        )


@pytest.fixture
def app_client(db: Session, tmp_path: Path) -> Iterator[TestClient]:
    repo = PlanRepository(db)
    for plan in DEFAULT_PLANS:
        repo.upsert_by_code(plan)
    db.flush()

    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_storage] = lambda: LocalFileStorage(str(tmp_path))
    app.dependency_overrides[get_prescription_reader] = FakeReader
    with TestClient(app) as test_client:
        yield test_client


def register(client: TestClient, email: str) -> TestClient:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Ana Lima",
            "email": email,
            "password": PASSWORD,
            "account_type": "user",
        },
    )
    assert response.status_code == 201, response.text
    return client


@pytest.fixture
def ana(app_client: TestClient) -> TestClient:
    return register(app_client, "ana@exemplo.com")
