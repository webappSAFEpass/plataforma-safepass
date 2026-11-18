from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.integrations.local_identity import ADMIN, EMPLOYEE, OTHER

OWNER = {"Authorization": "Bearer local-owner"}
ADMIN_AUTH = {"Authorization": "Bearer local-admin"}
OTHER_AUTH = {"Authorization": "Bearer local-other"}
EMPLOYEE_AUTH = {"Authorization": "Bearer local-employee"}


def provider(client: TestClient, headers=OWNER) -> str:
    response = client.post("/api/v1/providers", headers=headers, json={"display_name": "Clínica"})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def catalog(client: TestClient) -> str:
    category = client.post(
        "/api/v1/provider-categories", headers=ADMIN_AUTH, json={"name": "Saúde"}
    )
    assert category.status_code == 201
    response = client.post(
        "/api/v1/service-definitions",
        headers=ADMIN_AUTH,
        json={"name": "Consulta", "category_id": category.json()["id"]},
    )
    assert response.status_code == 201
    return response.json()["id"]


def company(client: TestClient) -> str:
    response = client.post(
        "/api/v1/companies",
        headers=OWNER,
        json={"legal_name": "Empresa", "trade_name": "Nome", "cnpj": "11.222.333/0001-81"},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_approval_visibility_partial_update_and_reapproval(client):
    pid = provider(client)
    path = f"/api/v1/providers/{pid}"
    assert client.get(path).status_code == 404
    assert client.get("/api/v1/providers").json()["total"] == 0
    assert client.get(path + "/profile", headers=OWNER).json()["status"] == "pending"
    assert client.get(path + "/profile", headers=OTHER_AUTH).status_code == 403
    decision = {"decision": "approved", "reason": "Conferido"}
    assert (
        client.post(path + "/approval-decisions", headers=OWNER, json=decision).status_code == 403
    )
    approved = client.post(path + "/approval-decisions", headers=ADMIN_AUTH, json=decision)
    assert approved.status_code == 200, approved.text
    assert approved.json()["reviewed_by"] == str(ADMIN)
    public = client.get(path).json()
    assert "owner_user_id" not in public and "review_reason" not in public
    assert client.get("/api/v1/providers").json()["total"] == 1
    assert (
        client.post(path + "/approval-decisions", headers=ADMIN_AUTH, json=decision).status_code
        == 409
    )
    updated = client.patch(path, headers=OWNER, json={"description": "Novo texto"})
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "pending"
    assert updated.json()["display_name"] == "Clínica"
    assert client.get(path).status_code == 404
    assert client.get(path + "/profile", headers=OWNER).json()["description"] == "Novo texto"
    assert client.patch(path, headers=OWNER, json={"display_name": None}).status_code == 422
    assert (
        client.patch(path, headers=OTHER_AUTH, json={"display_name": "Invasão"}).status_code == 403
    )
    assert client.get("/api/v1/provider-accounts", headers=OWNER).json()["total"] == 1
    assert client.get("/api/v1/provider-accounts", headers=OTHER_AUTH).json()["total"] == 0
    assert client.get("/api/v1/provider-accounts", headers=ADMIN_AUTH).json()["total"] == 1


def test_tags_catalog_search_and_price_changes(client):
    tag = client.post("/api/v1/provider-tags", headers=ADMIN_AUTH, json={"name": "Online"}).json()
    created = client.post(
        "/api/v1/providers", headers=OWNER, json={"display_name": "Clínica", "tag_ids": [tag["id"]]}
    )
    pid = created.json()["id"]
    assert created.json()["tag_ids"] == [tag["id"]]
    assert (
        client.patch(
            f"/api/v1/providers/{pid}", headers=OWNER, json={"description": "Texto"}
        ).status_code
        == 200
    )
    assert client.get("/api/v1/provider-tags").json()["total"] == 1
    assert (
        client.post(
            "/api/v1/provider-tags", headers=ADMIN_AUTH, json={"name": "Online"}
        ).status_code
        == 409
    )
    assert (
        client.post("/api/v1/provider-categories", headers=OWNER, json={"name": "X"}).status_code
        == 403
    )
    sid = catalog(client)
    assert client.get("/api/v1/provider-categories").json()["total"] == 1
    assert client.get("/api/v1/service-definitions?search=cons").json()["total"] == 1
    assert client.get("/api/v1/service-definitions?search=%25").json()["total"] == 0
    path = f"/api/v1/providers/{pid}/services"
    response = client.post(path, headers=OWNER, json={"service_id": sid, "price": "180.00"})
    assert response.status_code == 201, response.text
    lid = response.json()["id"]
    assert response.json()["price"] == "180.00"
    assert (
        client.post(path, headers=OWNER, json={"service_id": sid, "price": "10"}).status_code == 409
    )
    updated = client.patch(
        path + f"/{lid}",
        headers=OWNER,
        json={"min_price": "100", "max_price": "200", "active": False},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["price"] is None and not updated.json()["active"]
    assert client.get(path, headers=OWNER).json()["total"] == 1
    assert (
        client.post(
            path, headers=OWNER, json={"service_id": str(uuid4()), "price": "10"}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/v1/service-definitions",
            headers=ADMIN_AUTH,
            json={"name": "X", "category_id": str(uuid4())},
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/providers/{pid}", headers=OWNER, json={"tag_ids": [str(uuid4())]}
        ).status_code
        == 404
    )
    assert (
        client.patch(f"/api/v1/providers/{pid}", headers=OWNER, json={"tag_ids": []}).json()[
            "tag_ids"
        ]
        == []
    )


def test_pending_service_request_does_not_block_profile_or_other_service(client):
    pid = provider(client)
    base = f"/api/v1/providers/{pid}"
    request = client.post(
        base + "/service-requests", headers=OWNER, json={"suggested_name": "Novo procedimento"}
    )
    assert request.status_code == 201
    rid = request.json()["id"]
    assert request.json()["status"] == "pending"
    sid = catalog(client)
    assert (
        client.post(
            base + "/services", headers=OWNER, json={"service_id": sid, "price": "0"}
        ).status_code
        == 201
    )
    assert client.patch(base, headers=OWNER, json={"phone": "11999999999"}).status_code == 200
    assert client.get(base + "/service-requests", headers=OWNER).json()["total"] == 1
    decision = {"decision": "approved", "reason": "Catálogo conferido", "service_id": sid}
    decision_path = base + f"/service-requests/{rid}/decisions"
    assert client.post(decision_path, headers=OWNER, json=decision).status_code == 403
    result = client.post(decision_path, headers=ADMIN_AUTH, json=decision)
    assert result.status_code == 200, result.text
    assert result.json()["decided_at"] is not None
    assert client.post(decision_path, headers=ADMIN_AUTH, json=decision).status_code == 409


def test_professional_multiple_clinics_and_reception_permissions(client):
    a, b = provider(client), provider(client, OTHER_AUTH)
    path = f"/api/v1/providers/{a}"
    professional = client.post(
        path + "/professional-records",
        headers=ADMIN_AUTH,
        json={"name": "Recepção", "user_id": str(EMPLOYEE)},
    )
    assert professional.status_code == 201, professional.text
    data = {"professional_id": professional.json()["id"], "role": "receptionist"}
    link = client.post(path + "/professionals", headers=ADMIN_AUTH, json=data)
    assert link.status_code == 201, link.text
    assert (
        client.post(
            f"/api/v1/providers/{b}/professionals", headers=ADMIN_AUTH, json=data
        ).status_code
        == 201
    )
    assert client.post(path + "/professionals", headers=ADMIN_AUTH, json=data).status_code == 409
    assert client.get(path + "/profile", headers=EMPLOYEE_AUTH).status_code == 200
    assert client.patch(path, headers=EMPLOYEE_AUTH, json={"description": "X"}).status_code == 403
    assert client.get(path + "/services", headers=EMPLOYEE_AUTH).status_code == 403
    assert client.get(path + "/professionals", headers=OWNER).json()["total"] == 1
    lid = link.json()["id"]
    assert (
        client.patch(
            path + f"/professionals/{lid}",
            headers=OWNER,
            json={"role": "professional", "active": False},
        ).status_code
        == 200
    )
    assert client.get(path + "/profile", headers=EMPLOYEE_AUTH).status_code == 403
    assert client.get(f"/api/v1/providers/{b}/profile", headers=EMPLOYEE_AUTH).status_code == 200
    assert client.delete(path + f"/professionals/{lid}", headers=OWNER).status_code == 204


def test_professional_binding_is_not_an_identity_creation_api(client):
    pid = provider(client)
    path = f"/api/v1/providers/{pid}/professional-records"
    assert (
        client.post(path, headers=OWNER, json={"name": "X", "user_id": str(OTHER)}).status_code
        == 403
    )
    assert (
        client.post(
            path, headers=ADMIN_AUTH, json={"name": "X", "user_id": str(uuid4())}
        ).status_code
        == 404
    )
    record = client.post(path, headers=OWNER, json={"name": "Profissional sem conta"})
    assert record.status_code == 201 and record.json()["user_id"] is None


def test_company_crud_employees_duplicates_filters_and_soft_delete(client):
    cid = company(client)
    base = f"/api/v1/companies/{cid}"
    assert client.get(base, headers=OWNER).json()["cnpj"] == "11222333000181"
    assert client.get(base, headers=OTHER_AUTH).status_code == 403
    assert (
        client.patch(base, headers=OWNER, json={"trade_name": "Novo"}).json()["trade_name"]
        == "Novo"
    )
    assert client.patch(base, headers=OWNER, json={"legal_name": None}).status_code == 422
    assert client.get("/api/v1/companies", headers=OWNER).json()["total"] == 1
    assert client.get("/api/v1/companies", headers=OTHER_AUTH).json()["total"] == 0
    data = {"user_id": str(EMPLOYEE), "department": "Tecnologia", "employee_number": "47"}
    response = client.post(base + "/employees", headers=OWNER, json=data)
    assert response.status_code == 201, response.text
    eid = response.json()["id"]
    assert client.post(base + "/employees", headers=OWNER, json=data).status_code == 409
    assert client.get(base + "/employees?search=tec", headers=OWNER).json()["total"] == 1
    assert client.get(base + "/employees?search=inexistente", headers=OWNER).json()["total"] == 0
    assert client.get(base + "/employees", headers=EMPLOYEE_AUTH).status_code == 403
    assert client.get("/api/v1/companies", headers=EMPLOYEE_AUTH).json()["total"] == 0
    assert client.delete(base + f"/employees/{eid}", headers=OWNER).status_code == 204
    assert client.get(base + "/employees?active=true", headers=OWNER).json()["total"] == 0
    assert client.get(base + "/employees?active=false", headers=OWNER).json()["total"] == 1
    assert client.patch(
        base + f"/employees/{eid}", headers=OWNER, json={"active": True, "department": "RH"}
    ).json()["active"]
    assert (
        client.post(base + "/employees", headers=OWNER, json={"user_id": str(uuid4())}).status_code
        == 404
    )
    assert client.get(base, headers=OWNER).json()["responsible_user_id"]


def test_hr_cannot_promote_other_users_or_modify_hr_memberships(client):
    cid = company(client)
    base = f"/api/v1/companies/{cid}"
    hr = client.post(
        base + "/employees", headers=OWNER, json={"user_id": str(EMPLOYEE), "role": "hr"}
    ).json()
    assert client.get(base, headers=EMPLOYEE_AUTH).status_code == 200
    assert client.get("/api/v1/companies", headers=EMPLOYEE_AUTH).json()["total"] == 1
    assert (
        client.post(
            base + "/employees", headers=EMPLOYEE_AUTH, json={"user_id": str(OTHER), "role": "hr"}
        ).status_code
        == 403
    )
    assert client.delete(base + f"/employees/{hr['id']}", headers=EMPLOYEE_AUTH).status_code == 403
    assert (
        client.post(
            base + "/employees", headers=EMPLOYEE_AUTH, json={"user_id": str(OTHER)}
        ).status_code
        == 201
    )


@pytest.mark.parametrize(
    "body",
    [
        {"price": "-1"},
        {"min_price": "200", "max_price": "100"},
        {"price": "10", "min_price": "1", "max_price": "20"},
        {"min_price": "10"},
        {"price": "1.001"},
        {"price": "NaN"},
    ],
)
def test_invalid_prices_rejected(client, body):
    pid = provider(client)
    response = client.post(
        f"/api/v1/providers/{pid}/services",
        headers=OWNER,
        json={"service_id": str(uuid4()), **body},
    )
    assert response.status_code == 422


@pytest.mark.parametrize("cnpj", ["11111111111111", "11222333000180", "abc", "123"])
def test_invalid_cnpj_rejected(client, cnpj):
    assert (
        client.post(
            "/api/v1/companies",
            headers=OWNER,
            json={"legal_name": "X", "trade_name": "Y", "cnpj": cnpj},
        ).status_code
        == 422
    )


def test_auth_validation_and_health(client):
    assert client.get("/health").json() == {"status": "ok", "database": "ok"}
    assert client.post("/api/v1/providers", json={"display_name": "X"}).status_code == 401
    assert (
        client.post(
            "/api/v1/providers",
            headers={"Authorization": "Bearer nope"},
            json={"display_name": "X"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/providers", headers=EMPLOYEE_AUTH, json={"display_name": "X"}
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/companies",
            headers=EMPLOYEE_AUTH,
            json={"legal_name": "X", "trade_name": "Y", "cnpj": "11222333000181"},
        ).status_code
        == 403
    )
    assert client.get("/api/v1/providers?page=0").status_code == 422
    assert client.get("/api/v1/providers?size=101").status_code == 422
    response = client.post(
        "/api/v1/providers", headers=OWNER, json={"display_name": "", "password": "never-echo"}
    )
    assert response.status_code == 422 and "never-echo" not in response.text
    assert response.headers["x-request-id"]
    schema = client.get("/openapi.json").json()
    assert "/api/v1/providers" in schema["paths"]


def test_database_price_constraint_is_not_only_pydantic(db: Session, client):
    pid = provider(client)
    sid = catalog(client)
    with pytest.raises(IntegrityError), db.begin_nested():
        db.execute(
            text("""INSERT INTO provider_services
        (id, provider_id, service_id, price, active, created_at, updated_at)
        VALUES (:id, :pid, :sid, -1, true, now(), now())"""),
            {"id": uuid4(), "pid": pid, "sid": sid},
        )


def test_public_service_projection_requires_approval_and_active_service(client):
    pid = provider(client)
    sid = catalog(client)
    path = f"/api/v1/providers/{pid}"
    record = client.post(
        path + "/services", headers=OWNER, json={"service_id": sid, "price": "25"}
    ).json()
    assert client.get(path + "/public-services").status_code == 404
    client.post(
        path + "/approval-decisions",
        headers=ADMIN_AUTH,
        json={"decision": "approved", "reason": "Conferido"},
    )
    assert client.get(path + "/public-services").json()["total"] == 1
    client.patch(
        path + f"/services/{record['id']}", headers=OWNER, json={"price": "25", "active": False}
    )
    assert client.get(path + "/public-services").json()["total"] == 0


def test_manager_cannot_grant_administrative_access(client):
    pid = provider(client)
    base = f"/api/v1/providers/{pid}"
    prof = client.post(
        base + "/professional-records",
        headers=ADMIN_AUTH,
        json={"name": "Gestor", "user_id": str(EMPLOYEE)},
    ).json()
    link = client.post(
        base + "/professionals",
        headers=ADMIN_AUTH,
        json={"professional_id": prof["id"], "role": "manager"},
    ).json()
    assert client.patch(base, headers=EMPLOYEE_AUTH, json={"phone": "123"}).status_code == 200
    assert (
        client.patch(
            base + f"/professionals/{link['id']}", headers=EMPLOYEE_AUTH, json={"role": "manager"}
        ).status_code
        == 403
    )
    owned = client.post(
        base + "/professional-records", headers=EMPLOYEE_AUTH, json={"name": "Novo profissional"}
    ).json()
    assert (
        client.post(
            base + "/professionals",
            headers=EMPLOYEE_AUTH,
            json={"professional_id": owned["id"], "role": "manager"},
        ).status_code
        == 403
    )


def test_foreign_professional_cannot_be_linked_by_guessing_id(client):
    pid = provider(client)
    other = provider(client, OTHER_AUTH)
    prof = client.post(
        f"/api/v1/providers/{other}/professional-records",
        headers=OTHER_AUTH,
        json={"name": "Outra clínica"},
    ).json()
    assert (
        client.post(
            f"/api/v1/providers/{pid}/professionals",
            headers=OWNER,
            json={"professional_id": prof["id"]},
        ).status_code
        == 403
    )


def test_rejected_request_and_provider_can_be_revised_without_automatic_publication(client):
    pid = provider(client)
    path = f"/api/v1/providers/{pid}"
    decision = {"decision": "rejected", "reason": "Documentação pendente"}
    assert (
        client.post(path + "/approval-decisions", headers=ADMIN_AUTH, json=decision).json()[
            "status"
        ]
        == "rejected"
    )
    assert client.get(path).status_code == 404
    assert (
        client.patch(path, headers=OWNER, json={"description": "Revisado"}).json()["status"]
        == "pending"
    )
    req = client.post(
        path + "/service-requests", headers=OWNER, json={"suggested_name": "Serviço não aceito"}
    ).json()
    assert (
        client.post(
            path + f"/service-requests/{req['id']}/decisions", headers=ADMIN_AUTH, json=decision
        ).json()["status"]
        == "rejected"
    )


def test_missing_scoped_resources_return_404(client):
    pid = provider(client)
    cid = company(client)
    for path in [f"/api/v1/providers/{uuid4()}/profile", f"/api/v1/companies/{uuid4()}"]:
        assert client.get(path, headers=OWNER).status_code == 404
    assert (
        client.patch(
            f"/api/v1/providers/{pid}/services/{uuid4()}", headers=OWNER, json={"price": "5"}
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/companies/{cid}/employees/{uuid4()}", headers=OWNER, json={"active": False}
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/api/v1/providers/{pid}/professionals/{uuid4()}", headers=OWNER).status_code
        == 404
    )
