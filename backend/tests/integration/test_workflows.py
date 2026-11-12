from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.integrations.local_identity import DEPENDENT, MANAGER, PLAN_PREMIUM
from app.modules.coupons.models import Coupon, CouponPlan

MANAGER_AUTH = {"Authorization": "Bearer local-manager"}
OTHER_MANAGER_AUTH = {"Authorization": "Bearer local-other-manager"}
DEPENDENT_AUTH = {"Authorization": "Bearer local-dependent"}


def _seed_coupon(
    db: Session, *, cost_points: int = 100, plan_ids: list[UUID] | None = None
) -> Coupon:
    coupon = Coupon(title="Desconto consulta", description="10% off", cost_points=cost_points)
    coupon.plan_links = [CouponPlan(plan_id=p) for p in (plan_ids or [])]
    db.add(coupon)
    db.flush()
    return coupon


def _grant_points(
    client: TestClient, db: Session, headers: dict, manager_id: UUID, amount: int
) -> None:
    client.get("/api/v1/pontos/saldo", headers=headers)  # lazily provisions the account
    db.execute(
        text("UPDATE manager_accounts SET balance = balance + :amt WHERE manager_user_id = :uid"),
        {"amt": amount, "uid": str(manager_id)},
    )
    db.flush()


def test_health_reports_database_ok(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_protected_route_without_token_is_unauthorized(client: TestClient):
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 401


def test_dashboard_for_fresh_manager_has_empty_but_well_formed_sections(client: TestClient):
    response = client.get("/api/v1/dashboard", headers=MANAGER_AUTH)
    assert response.status_code == 200
    body = response.json()
    assert body["points_balance"] == 0
    assert body["dependents"] == []
    assert body["active_coupons"] == []
    assert body["agenda"] == []


def test_marketplace_search_without_filters_is_alphabetical(client: TestClient):
    response = client.get("/api/v1/prestadores", headers=MANAGER_AUTH)
    assert response.status_code == 200
    names = [item["name"] for item in response.json()["items"]]
    assert names == sorted(names)
    assert len(names) > 0


def test_marketplace_filter_by_category_only_returns_matches(client: TestClient):
    response = client.get(
        "/api/v1/prestadores", params={"categoria": "Veterinária"}, headers=MANAGER_AUTH
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) > 0
    assert all(item["category"] == "Veterinária" for item in items)


def test_favorite_then_unfavorite_provider(client: TestClient):
    provider_id = client.get("/api/v1/prestadores", headers=MANAGER_AUTH).json()["items"][0]["id"]

    put = client.put(f"/api/v1/favoritos/{provider_id}", headers=MANAGER_AUTH)
    assert put.status_code == 204

    favorites = client.get("/api/v1/favoritos", headers=MANAGER_AUTH).json()
    assert any(f["provider_id"] == provider_id for f in favorites["items"])

    delete = client.delete(f"/api/v1/favoritos/{provider_id}", headers=MANAGER_AUTH)
    assert delete.status_code == 204
    favorites_after = client.get("/api/v1/favoritos", headers=MANAGER_AUTH).json()
    assert not any(f["provider_id"] == provider_id for f in favorites_after["items"])


def test_review_updates_average_and_credits_points(client: TestClient):
    provider_id = client.get("/api/v1/prestadores", headers=MANAGER_AUTH).json()["items"][0]["id"]
    balance_before = client.get("/api/v1/pontos/saldo", headers=MANAGER_AUTH).json()["balance"]

    response = client.post(
        f"/api/v1/prestadores/{provider_id}/avaliacoes",
        json={"rating": 5, "comment": "Excelente atendimento"},
        headers=MANAGER_AUTH,
    )
    assert response.status_code == 201

    summary = client.get(f"/api/v1/prestadores/{provider_id}/avaliacoes", headers=MANAGER_AUTH)
    assert summary.json()["average_rating"] == 5.0

    balance_after = client.get("/api/v1/pontos/saldo", headers=MANAGER_AUTH).json()["balance"]
    assert balance_after > balance_before

    extrato = client.get("/api/v1/pontos/extrato", headers=MANAGER_AUTH).json()
    assert any(t["origin"] == "Avaliação válida" for t in extrato["items"])


def test_dependent_permission_defaults_blocked_then_can_be_released(
    client: TestClient, db: Session
):
    created = client.post(
        "/api/v1/dependentes", json={"type": "person", "name": "Lucas"}, headers=MANAGER_AUTH
    )
    assert created.status_code == 201
    dependent = created.json()
    assert dependent["can_redeem_coupons"] is False

    db.execute(
        text("UPDATE dependents SET linked_user_id = :uid WHERE id = :did"),
        {"uid": str(DEPENDENT), "did": dependent["id"]},
    )
    db.flush()

    coupon = _seed_coupon(db, cost_points=10)
    _grant_points(client, db, MANAGER_AUTH, MANAGER, 10)

    blocked = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=DEPENDENT_AUTH)
    assert blocked.status_code == 403

    released = client.patch(
        f"/api/v1/dependentes/{dependent['id']}",
        json={"can_redeem_coupons": True},
        headers=MANAGER_AUTH,
    )
    assert released.status_code == 200
    assert released.json()["can_redeem_coupons"] is True

    allowed = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=DEPENDENT_AUTH)
    assert allowed.status_code == 201
    assert allowed.json()["status"] == "active"


def test_redeem_coupon_debits_points_and_issues_usable_token(client: TestClient, db: Session):
    coupon = _seed_coupon(db, cost_points=50)
    _grant_points(client, db, MANAGER_AUTH, MANAGER, 50)
    balance_before = client.get("/api/v1/pontos/saldo", headers=MANAGER_AUTH).json()["balance"]

    redeem = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=MANAGER_AUTH)
    assert redeem.status_code == 201
    body = redeem.json()
    assert body["status"] == "active"
    assert body["points_debited"] == 50

    balance_after = client.get("/api/v1/pontos/saldo", headers=MANAGER_AUTH).json()["balance"]
    assert balance_after == balance_before - 50

    used = client.post(f"/api/v1/resgates/{body['token']}/utilizacao", headers=MANAGER_AUTH)
    assert used.status_code == 200
    assert used.json()["status"] == "used"

    used_again = client.post(f"/api/v1/resgates/{body['token']}/utilizacao", headers=MANAGER_AUTH)
    assert used_again.status_code == 409


def test_redeem_coupon_with_insufficient_balance_debits_nothing(client: TestClient, db: Session):
    coupon = _seed_coupon(db, cost_points=1_000_000)

    response = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=MANAGER_AUTH)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "insufficient_balance"


def test_redeem_coupon_locked_for_a_plan_the_manager_does_not_have(client: TestClient, db: Session):
    other_plan = UUID("40000000-0000-0000-0000-000000000099")
    coupon = _seed_coupon(db, cost_points=10, plan_ids=[other_plan])

    listing = client.get("/api/v1/cupons", headers=OTHER_MANAGER_AUTH).json()
    listed = next(c for c in listing["items"] if c["id"] == str(coupon.id))
    assert listed["locked"] is True

    response = client.post(
        f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=OTHER_MANAGER_AUTH
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "coupon_locked"


def test_redeem_coupon_unlocked_for_managers_own_plan(client: TestClient, db: Session):
    coupon = _seed_coupon(db, cost_points=10, plan_ids=[PLAN_PREMIUM])
    _grant_points(client, db, MANAGER_AUTH, MANAGER, 10)

    listing = client.get("/api/v1/cupons", headers=MANAGER_AUTH).json()
    listed = next(c for c in listing["items"] if c["id"] == str(coupon.id))
    assert listed["locked"] is False

    response = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=MANAGER_AUTH)
    assert response.status_code == 201


def test_redeem_coupon_idempotency_key_prevents_double_debit(client: TestClient, db: Session):
    coupon = _seed_coupon(db, cost_points=20)
    _grant_points(client, db, MANAGER_AUTH, MANAGER, 20)
    balance_before = client.get("/api/v1/pontos/saldo", headers=MANAGER_AUTH).json()["balance"]
    headers = {**MANAGER_AUTH, "Idempotency-Key": "50000000-0000-0000-0000-000000000001"}

    first = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=headers)
    second = client.post(f"/api/v1/cupons/{coupon.id}/resgates", json={}, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["token"] == second.json()["token"]

    balance_after = client.get("/api/v1/pontos/saldo", headers=MANAGER_AUTH).json()["balance"]
    assert balance_after == balance_before - 20


def test_dependent_without_link_cannot_act_as_dependent(client: TestClient):
    response = client.get("/api/v1/pontos/saldo", headers=DEPENDENT_AUTH)
    assert response.status_code == 403


def test_alerts_manual_create_and_list(client: TestClient):
    created = client.post(
        "/api/v1/alertas",
        json={"message": "Renovar plano", "occurs_on": "2026-11-01"},
        headers=MANAGER_AUTH,
    )
    assert created.status_code == 201

    listed = client.get("/api/v1/alertas", headers=MANAGER_AUTH).json()
    assert any(a["message"] == "Renovar plano" for a in listed["items"])
