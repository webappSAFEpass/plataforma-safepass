from dataclasses import dataclass, field
from datetime import timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.core.email import EmailDeliveryError
from app.core.security import hash_password
from app.modules.auth.exceptions import (
    EmailAlreadyRegisteredError,
    InvalidAccountTypeError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidResetTokenError,
)
from app.modules.auth.service import AuthService
from app.shared.roles import Role

SETTINGS = SimpleNamespace(
    jwt_secret="s" * 40,
    jwt_algorithm="HS256",
    access_token_minutes=15,
    refresh_token_days=7,
    password_reset_minutes=30,
    frontend_url="http://front.test",
)


@dataclass
class FakeUser:
    id: UUID
    email: str
    password_hash: str
    full_name: str
    role: str
    is_active: bool = True


@dataclass
class FakeToken:
    user_id: UUID
    token_hash: str
    expires_at: object
    revoked_at: object = None
    used_at: object = None


class FakeUsers:
    def __init__(self) -> None:
        self.by_email: dict[str, FakeUser] = {}

    def get_by_email(self, email: str) -> FakeUser | None:
        return self.by_email.get(email)

    def get_by_id(self, user_id: UUID) -> FakeUser | None:
        return next((u for u in self.by_email.values() if u.id == user_id), None)

    def add(self, *, email: str, password_hash: str, full_name: str, role: Role) -> FakeUser:
        user = FakeUser(uuid4(), email, password_hash, full_name, role.value)
        self.by_email[email] = user
        return user


class FakeTokens:
    def __init__(self) -> None:
        self.refresh: dict[str, FakeToken] = {}
        self.reset: dict[str, FakeToken] = {}

    def add_refresh_token(self, *, user_id, token_hash, expires_at) -> FakeToken:  # type: ignore[no-untyped-def]
        self.refresh[token_hash] = FakeToken(user_id, token_hash, expires_at)
        return self.refresh[token_hash]

    def get_refresh_token(self, token_hash: str) -> FakeToken | None:
        return self.refresh.get(token_hash)

    def revoke_all_refresh_tokens(self, user_id: UUID, now) -> None:  # type: ignore[no-untyped-def]
        for token in self.refresh.values():
            if token.user_id == user_id and token.revoked_at is None:
                token.revoked_at = now

    def add_reset_token(self, *, user_id, token_hash, expires_at) -> FakeToken:  # type: ignore[no-untyped-def]
        self.reset[token_hash] = FakeToken(user_id, token_hash, expires_at)
        return self.reset[token_hash]

    def get_reset_token(self, token_hash: str) -> FakeToken | None:
        return self.reset.get(token_hash)


@dataclass
class FakeFreePlan:
    assigned: list[UUID] = field(default_factory=list)

    def assign_free_plan(self, user_id: UUID) -> None:
        self.assigned.append(user_id)


@dataclass
class FakeEmail:
    sent: list[dict[str, str]] = field(default_factory=list)
    fail: bool = False

    def send(self, *, to: str, subject: str, body: str) -> None:
        if self.fail:
            raise EmailDeliveryError()
        self.sent.append({"to": to, "subject": subject, "body": body})


@pytest.fixture
def parts(clock, uow):  # type: ignore[no-untyped-def]
    users, tokens, free, email = FakeUsers(), FakeTokens(), FakeFreePlan(), FakeEmail()
    service = AuthService(users, tokens, free, email, uow, clock, SETTINGS)  # type: ignore[arg-type]
    return SimpleNamespace(
        service=service, users=users, tokens=tokens, free=free, email=email, clock=clock, uow=uow
    )


def _register(parts, email="ana@exemplo.com", account_type="user"):  # type: ignore[no-untyped-def]
    return parts.service.register(
        full_name="Ana Lima", email=email, password="Senha123", account_type=account_type
    )


def test_register_user_hashes_password_assigns_free_plan_and_commits(parts) -> None:  # type: ignore[no-untyped-def]
    result = _register(parts)

    stored = parts.users.by_email["ana@exemplo.com"]
    assert stored.password_hash != "Senha123"
    assert parts.free.assigned == [stored.id]
    assert parts.uow.commits == 1
    assert result.tokens.access_token and result.tokens.refresh_token


def test_register_normalizes_email(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts, email="  ANA@Exemplo.com ")
    assert "ana@exemplo.com" in parts.users.by_email


def test_register_provider_does_not_assign_free_plan(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts, account_type="provider")
    assert parts.free.assigned == []


def test_register_duplicate_email_raises_conflict(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    with pytest.raises(EmailAlreadyRegisteredError):
        _register(parts)


@pytest.mark.parametrize("account_type", ["admin", "dependent"])
def test_register_with_privileged_account_type_raises(parts, account_type) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(InvalidAccountTypeError):
        _register(parts, account_type=account_type)
    assert parts.users.by_email == {}


def test_login_with_valid_credentials_returns_tokens(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    result = parts.service.login(email="ANA@exemplo.com", password="Senha123")
    assert result.user.email == "ana@exemplo.com"


def test_login_with_wrong_password_raises_invalid_credentials(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    with pytest.raises(InvalidCredentialsError):
        parts.service.login(email="ana@exemplo.com", password="errada123")


def test_login_unknown_email_raises_same_error(parts) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(InvalidCredentialsError):
        parts.service.login(email="ninguem@exemplo.com", password="Senha123")


def test_login_inactive_user_raises_invalid_credentials(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    parts.users.by_email["ana@exemplo.com"].is_active = False
    with pytest.raises(InvalidCredentialsError):
        parts.service.login(email="ana@exemplo.com", password="Senha123")


def test_refresh_rotates_token_and_revokes_the_old_one(parts) -> None:  # type: ignore[no-untyped-def]
    first = _register(parts).tokens
    second = parts.service.refresh(first.refresh_token).tokens
    assert second.refresh_token != first.refresh_token
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh(first.refresh_token)


def test_refresh_reuse_of_rotated_token_revokes_all_sessions(parts) -> None:  # type: ignore[no-untyped-def]
    first = _register(parts).tokens
    second = parts.service.refresh(first.refresh_token).tokens
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh(first.refresh_token)  # reuso => derruba tudo
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh(second.refresh_token)


def test_refresh_with_expired_token_raises(parts) -> None:  # type: ignore[no-untyped-def]
    tokens = _register(parts).tokens
    parts.clock.advance(timedelta(days=8))
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh(tokens.refresh_token)


def test_refresh_with_unknown_token_raises(parts) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh("nao-existe")


def test_logout_revokes_refresh_token(parts) -> None:  # type: ignore[no-untyped-def]
    tokens = _register(parts).tokens
    parts.service.logout(tokens.refresh_token)
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh(tokens.refresh_token)


def test_logout_without_token_does_nothing(parts) -> None:  # type: ignore[no-untyped-def]
    parts.service.logout(None)
    assert parts.uow.commits == 0


def test_forgot_password_for_known_email_sends_link_with_token(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    parts.service.forgot_password("ana@exemplo.com")
    assert len(parts.email.sent) == 1
    assert "http://front.test/redefinir-senha?token=" in parts.email.sent[0]["body"]


def test_forgot_password_for_unknown_email_is_silent(parts) -> None:  # type: ignore[no-untyped-def]
    parts.service.forgot_password("ninguem@exemplo.com")
    assert parts.email.sent == []


def test_forgot_password_survives_email_delivery_failure(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    parts.email.fail = True
    parts.service.forgot_password("ana@exemplo.com")  # não propaga o erro


def _extract_token(parts) -> str:  # type: ignore[no-untyped-def]
    return parts.email.sent[0]["body"].split("token=")[1].split()[0]


def test_reset_password_changes_password_and_revokes_sessions(parts) -> None:  # type: ignore[no-untyped-def]
    session = _register(parts).tokens
    parts.service.forgot_password("ana@exemplo.com")
    parts.service.reset_password(token=_extract_token(parts), new_password="NovaSenha9")

    parts.service.login(email="ana@exemplo.com", password="NovaSenha9")
    with pytest.raises(InvalidRefreshTokenError):
        parts.service.refresh(session.refresh_token)


def test_reset_password_token_is_single_use(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    parts.service.forgot_password("ana@exemplo.com")
    token = _extract_token(parts)
    parts.service.reset_password(token=token, new_password="NovaSenha9")
    with pytest.raises(InvalidResetTokenError):
        parts.service.reset_password(token=token, new_password="OutraSenha9")


def test_reset_password_with_expired_token_raises(parts) -> None:  # type: ignore[no-untyped-def]
    _register(parts)
    parts.service.forgot_password("ana@exemplo.com")
    token = _extract_token(parts)
    parts.clock.advance(timedelta(minutes=31))
    with pytest.raises(InvalidResetTokenError):
        parts.service.reset_password(token=token, new_password="NovaSenha9")


def test_reset_password_with_invalid_token_raises(parts) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(InvalidResetTokenError):
        parts.service.reset_password(token="x" * 20, new_password="NovaSenha9")


def test_hash_password_helper_is_used_for_fake_users() -> None:
    assert hash_password("a") != hash_password("a")  # salt aleatório
