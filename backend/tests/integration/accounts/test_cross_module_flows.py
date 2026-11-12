"""Integração entre os três desafios, com autenticação real (JWT do D01).

D01 emite a sessão e o plano; D03 cadastra prestadores; D02 consome ambos por meio do
`Principal` e do catálogo de prestadores.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.repository import UserRepository
from app.shared.roles import Role

PASSWORD = "Senha123"


def _login_as(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    token = response.cookies["access_token"]
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, email: str, account_type: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Pessoa Teste",
            "email": email,
            "password": PASSWORD,
            "account_type": account_type,
        },
    )
    assert response.status_code == 201, response.text
    client.cookies.clear()
    return _login_as(client, email)


def _admin(client: TestClient, db: Session) -> dict[str, str]:
    UserRepository(db).add(
        email="admin@exemplo.com",
        password_hash=hash_password(PASSWORD),
        full_name="Admin",
        role=Role.ADMIN,
    )
    db.commit()
    return _login_as(client, "admin@exemplo.com")


def test_dashboard_exposes_plan_from_real_subscription(client: TestClient) -> None:
    headers = _register(client, "gestor@exemplo.com", "user")
    plans = {p["code"]: p["id"] for p in client.get("/api/v1/plans").json()}

    free = client.get("/api/v1/dashboard", headers=headers)
    assert free.status_code == 200, free.text
    assert free.json()["plan_id"] == plans["free"]

    subscribed = client.post(
        "/api/v1/subscriptions",
        headers=headers,
        json={"plan_code": "aura", "accept_terms": True},
    )
    assert subscribed.status_code == 201, subscribed.text
    assert client.get("/api/v1/dashboard", headers=headers).json()["plan_id"] == plans["aura"]


def test_d02_endpoints_reject_anonymous_and_invalid_tokens(client: TestClient) -> None:
    assert client.get("/api/v1/dashboard").status_code == 401
    bad = {"Authorization": "Bearer local-manager"}
    assert client.get("/api/v1/dashboard", headers=bad).status_code == 401


def test_marketplace_lists_only_approved_providers_from_d03(
    client: TestClient, db: Session
) -> None:
    owner = _register(client, "clinica@exemplo.com", "provider")
    manager = _register(client, "gestor@exemplo.com", "user")
    admin = _admin(client, db)

    created = client.post(
        "/api/v1/providers",
        headers=owner,
        json={"display_name": "Clínica Vida", "phone": "(61) 99999-0000"},
    )
    assert created.status_code == 201, created.text
    provider_id = created.json()["id"]

    pending = client.get("/api/v1/prestadores", headers=manager)
    assert pending.status_code == 200, pending.text
    assert pending.json()["items"] == []
    assert client.get(f"/api/v1/prestadores/{provider_id}", headers=manager).status_code == 404

    approved = client.post(
        f"/api/v1/providers/{provider_id}/approval-decisions",
        headers=admin,
        json={"decision": "approved", "reason": "Documentação conferida."},
    )
    assert approved.status_code == 200, approved.text

    listed = client.get("/api/v1/prestadores", headers=manager).json()
    assert [p["name"] for p in listed["items"]] == ["Clínica Vida"]
    assert listed["items"][0]["contact"] == "(61) 99999-0000"
    assert listed["items"][0]["category"] == "Sem categoria"
    assert listed["items"][0]["price_tier"] is None
    assert client.get(f"/api/v1/prestadores/{provider_id}", headers=manager).status_code == 200


def test_marketplace_filters_by_category_tag_and_price_tier(
    client: TestClient, db: Session
) -> None:
    owner = _register(client, "clinica@exemplo.com", "provider")
    manager = _register(client, "gestor@exemplo.com", "user")
    admin = _admin(client, db)

    category = client.post("/api/v1/provider-categories", headers=admin, json={"name": "Saúde"})
    tag = client.post("/api/v1/provider-tags", headers=admin, json={"name": "domiciliar"})
    definition = client.post(
        "/api/v1/service-definitions",
        headers=admin,
        json={"name": "Consulta", "category_id": category.json()["id"]},
    )
    provider = client.post(
        "/api/v1/providers",
        headers=owner,
        json={"display_name": "Clínica Vida", "tag_ids": [tag.json()["id"]]},
    ).json()["id"]
    priced = client.post(
        f"/api/v1/providers/{provider}/services",
        headers=owner,
        json={"service_id": definition.json()["id"], "min_price": "100.00", "max_price": "300.00"},
    )
    assert priced.status_code == 201, priced.text
    client.post(
        f"/api/v1/providers/{provider}/approval-decisions",
        headers=admin,
        json={"decision": "approved", "reason": "Ok."},
    )

    def names(**params: object) -> list[str]:
        response = client.get("/api/v1/prestadores", headers=manager, params=params)
        assert response.status_code == 200, response.text
        return [p["name"] for p in response.json()["items"]]

    assert names(categoria="Saúde", tags=["domiciliar"], preco="medio") == ["Clínica Vida"]
    assert names(preco="baixo") == []
    assert names(preco="alto") == []
    assert names(categoria="Outra") == []
    assert names(tags=["inexistente"]) == []
    assert names(q="vida") == ["Clínica Vida"]
    card = client.get("/api/v1/prestadores", headers=manager).json()["items"][0]
    assert (card["category"], card["tags"], card["price_tier"]) == (
        "Saúde",
        ["domiciliar"],
        "medio",
    )
