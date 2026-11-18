from unittest.mock import Mock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.exceptions import DomainError
from app.integrations.contracts import ProfileSuggestion, UnconfiguredAdapters
from app.integrations.identity import Principal, UnconfiguredIdentity
from app.modules.companies.models import Company
from app.modules.companies.repository import CompanyRepository
from app.modules.companies.service import CompanyService
from app.modules.providers.models import Provider
from app.modules.providers.repository import ProviderRepository
from app.modules.providers.schemas import RequestDecision
from app.modules.providers.service import ProviderService


def test_provider_service_forbids_cross_tenant_without_database():
    repo = Mock(spec=ProviderRepository)
    repo.get.return_value = Provider(owner_user_id=uuid4(), display_name="Outro")
    repo.membership.return_value = None
    service = ProviderService(repo, UnconfiguredIdentity())
    with pytest.raises(DomainError) as error:
        service.access(uuid4(), Principal(uuid4()), manage=True)
    assert error.value.status_code == 403


def test_company_service_forbids_regular_employee_without_database():
    repo = Mock(spec=CompanyRepository)
    repo.get.return_value = Company(responsible_user_id=uuid4())
    repo.membership.return_value = Mock(role="employee")
    with pytest.raises(DomainError) as error:
        CompanyService(repo, UnconfiguredIdentity()).access(
            uuid4(), Principal(uuid4()), manage=True
        )
    assert error.value.status_code == 403


def test_unconfigured_identity_never_accepts_a_credential():
    with pytest.raises(DomainError) as error:
        UnconfiguredIdentity().authenticate("arbitrary")
    assert error.value.status_code == 503
    with pytest.raises(DomainError):
        UnconfiguredIdentity().require_user(uuid4())


def test_external_adapters_never_report_fake_success():
    adapter = UnconfiguredAdapters()
    operations = [
        lambda: adapter.consume(uuid4(), "opaque", uuid4()),
        lambda: adapter.respond(uuid4(), uuid4(), "Resposta"),
        lambda: adapter.active_benefit_ids(uuid4()),
        lambda: adapter.authorize_reference(uuid4(), uuid4(), uuid4()),
        lambda: adapter.suggest("Texto", []),
    ]
    for operation in operations:
        with pytest.raises(DomainError) as error:
            operation()
        assert error.value.code == "integration_unavailable"


def test_request_decision_requires_catalog_on_approval():
    with pytest.raises(ValidationError):
        RequestDecision(decision="approved", reason="OK")
    with pytest.raises(ValidationError):
        RequestDecision(decision="rejected", reason="Não", service_id=uuid4())


def test_ai_contract_rejects_extra_patient_data():
    with pytest.raises(ValidationError):
        ProfileSuggestion.model_validate({"description": "Texto", "tag_ids": [], "cpf": "private"})


def test_default_application_rejects_development_tokens():
    from fastapi.testclient import TestClient

    from app.main import create_app

    app = create_app()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers",
            headers={"Authorization": "Bearer local-admin"},
            json={"display_name": "X"},
        )
        # Identidade real (JWT do Desafio 01): tokens fictícios nunca autenticam.
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "unauthorized"
        assert client.post("/api/v1/providers", json={"display_name": "X"}).status_code == 401


def test_database_outage_is_sanitized():
    from fastapi.testclient import TestClient
    from sqlalchemy.exc import OperationalError

    from app.core.database import get_db
    from app.main import create_app

    def broken_database():
        raise OperationalError("sensitive SQL", {}, Exception("credentials"))

    app = create_app()
    app.dependency_overrides[get_db] = broken_database
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 503
        assert "credentials" not in response.text and "sensitive" not in response.text
