import pytest
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.platform_reviews.models import PlatformReview
from app.modules.users.repository import UserRepository
from app.shared.roles import Role

pytestmark = pytest.mark.integration

PASSWORD = "Senha123"


def _register(client, email="ana@exemplo.com", account_type="user"):  # type: ignore[no-untyped-def]
    return client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Ana Lima",
            "email": email,
            "password": PASSWORD,
            "account_type": account_type,
        },
    )


def _make_admin(db: Session, email="admin@exemplo.com") -> None:
    UserRepository(db).add(
        email=email, password_hash=hash_password(PASSWORD), full_name="Admin", role=Role.ADMIN
    )
    db.commit()


def test_register_then_me_returns_user_with_free_plan(client) -> None:  # type: ignore[no-untyped-def]
    assert _register(client).status_code == 201

    me = client.get("/api/v1/auth/me")

    assert me.status_code == 200
    assert me.json()["user"]["role"] == "user"
    assert me.json()["subscription"]["plan"]["code"] == "free"


def test_register_duplicate_email_returns_409_with_standard_error(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    response = _register(client)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_already_registered"


def test_login_with_wrong_password_returns_401(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/login", json={"email": "ana@exemplo.com", "password": "errada123"}
    )
    assert response.status_code == 401


def test_logout_clears_session(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401


def test_refresh_issues_new_session(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    assert client.post("/api/v1/auth/refresh").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200


def test_me_without_session_returns_401(client) -> None:  # type: ignore[no-untyped-def]
    assert client.get("/api/v1/auth/me").status_code == 401


def test_list_plans_is_public_and_ordered(client) -> None:  # type: ignore[no-untyped-def]
    codes = [p["code"] for p in client.get("/api/v1/plans").json()]
    assert codes == ["free", "aura", "aura_plus"]


def test_subscribe_paid_plan_requires_terms_then_succeeds(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    refused = client.post(
        "/api/v1/subscriptions", json={"plan_code": "aura", "accept_terms": False}
    )
    assert refused.status_code == 422
    assert refused.json()["error"]["code"] == "terms_not_accepted"

    ok = client.post("/api/v1/subscriptions", json={"plan_code": "aura", "accept_terms": True})
    assert ok.status_code == 201
    assert client.get("/api/v1/auth/me").json()["subscription"]["plan"]["code"] == "aura"


def test_regular_user_cannot_access_admin_endpoints(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    assert client.get("/api/v1/admin/platform-reviews").status_code == 403


def test_admin_filters_reviews_by_rating_and_replies(client, db: Session) -> None:  # type: ignore[no-untyped-def]
    for rating in (5, 5, 2):
        client.post(
            "/api/v1/platform-reviews",
            json={"author_name": "Visitante", "reviewer_profile": "visitor", "rating": rating},
        )
    _make_admin(db)
    client.post("/api/v1/auth/login", json={"email": "admin@exemplo.com", "password": PASSWORD})

    only_fives = client.get("/api/v1/admin/platform-reviews", params={"rating": 5}).json()
    assert only_fives["total"] == 2
    assert all(item["rating"] == 5 for item in only_fives["items"])

    review_id = only_fives["items"][0]["id"]
    replied = client.post(
        f"/api/v1/admin/platform-reviews/{review_id}/reply", json={"reply": "Obrigado!"}
    )
    assert replied.status_code == 200
    assert replied.json()["admin_reply"] == "Obrigado!"


def test_only_published_reviews_appear_in_featured(client, db: Session) -> None:  # type: ignore[no-untyped-def]
    db.add(
        PlatformReview(author_name="Pública", reviewer_profile="user", rating=5, is_published=True)
    )
    db.add(
        PlatformReview(author_name="Oculta", reviewer_profile="user", rating=5, is_published=False)
    )
    db.commit()

    names = [r["author_name"] for r in client.get("/api/v1/platform-reviews/featured").json()]

    assert names == ["Pública"]


def test_public_stats_counts_registered_users(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    stats = client.get("/api/v1/stats/public").json()
    assert stats["active_users"] == 1


def test_admin_dashboard_returns_operational_counts(client, db: Session) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    review = client.post(
        "/api/v1/platform-reviews",
        json={"author_name": "Visitante", "reviewer_profile": "visitor", "rating": 4},
    )
    assert review.status_code == 201
    referral = client.post(
        "/api/v1/referrals",
        json={
            "professional_name": "Dra. Maria",
            "specialty": "Clínica geral",
            "contact": "maria@example.com",
        },
    )
    assert referral.status_code == 201
    _make_admin(db)
    client.cookies.clear()
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "admin@exemplo.com", "password": PASSWORD}
        ).status_code
        == 200
    )

    response = client.get("/api/v1/admin/dashboard")

    assert response.status_code == 200
    stats = response.json()
    assert stats["active_users"] == 1
    assert stats["total_reviews"] == 1
    assert stats["pending_reviews"] == 1
    assert stats["total_referrals"] == 1
    assert stats["new_referrals"] == 1


def test_admin_can_update_plan_and_public_api_uses_new_values(client, db: Session) -> None:  # type: ignore[no-untyped-def]
    _make_admin(db)
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "admin@exemplo.com", "password": PASSWORD}
        ).status_code
        == 200
    )

    updated = client.patch(
        "/api/v1/admin/plans/aura",
        json={
            "name": "SAFEpass Aura Atualizado",
            "price_cents": 5390,
            "features": [{"label": "Benefício revisado", "included": True}],
        },
    )

    assert updated.status_code == 200
    assert updated.json()["name"] == "SAFEpass Aura Atualizado"
    assert updated.json()["price_cents"] == 5390
    assert updated.json()["features"] == [{"label": "Benefício revisado", "included": True}]
    public_plans = client.get("/api/v1/plans").json()
    aura = next(plan for plan in public_plans if plan["code"] == "aura")
    assert aura["price_cents"] == 5390


def test_admin_can_update_referral_status(client, db: Session) -> None:  # type: ignore[no-untyped-def]
    referral = client.post(
        "/api/v1/referrals",
        json={"professional_name": "Clínica Exemplo", "specialty": "Pediatria"},
    ).json()
    _make_admin(db)
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "admin@exemplo.com", "password": PASSWORD}
        ).status_code
        == 200
    )

    response = client.patch(
        f"/api/v1/admin/referrals/{referral['id']}", json={"status": "contacted"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "contacted"


def test_regular_user_cannot_access_admin_dashboard_or_edit_plans(client) -> None:  # type: ignore[no-untyped-def]
    _register(client)
    assert client.get("/api/v1/admin/dashboard").status_code == 403
    assert client.get("/api/v1/admin/plans").status_code == 403
