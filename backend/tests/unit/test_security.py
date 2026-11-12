from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.core.security import (
    InvalidAccessTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)

SECRET = "x" * 40


def test_verify_password_with_correct_password_returns_true() -> None:
    hashed = hash_password("Senha123")
    assert hashed != "Senha123"
    assert verify_password(hashed, "Senha123") is True


def test_verify_password_with_wrong_password_returns_false() -> None:
    assert verify_password(hash_password("Senha123"), "outra") is False


def test_verify_password_with_malformed_hash_returns_false() -> None:
    assert verify_password("nao-e-um-hash", "Senha123") is False


def test_hash_token_is_deterministic_and_not_plaintext() -> None:
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != "abc"


def test_access_token_roundtrip_returns_user_id_and_role() -> None:
    user_id = uuid4()
    token = create_access_token(
        user_id=user_id,
        role="user",
        secret=SECRET,
        algorithm="HS256",
        expires_in=timedelta(days=36500),
        now=datetime.now(UTC),
    )
    payload = decode_access_token(token, secret=SECRET, algorithm="HS256")
    assert payload.user_id == user_id
    assert payload.role == "user"


def test_decode_access_token_expired_raises() -> None:
    expired = create_access_token(
        user_id=uuid4(),
        role="user",
        secret=SECRET,
        algorithm="HS256",
        expires_in=timedelta(minutes=1),
        now=datetime(2020, 1, 1, tzinfo=UTC),
    )
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(expired, secret=SECRET, algorithm="HS256")


def test_decode_access_token_with_wrong_secret_raises() -> None:
    token = create_access_token(
        user_id=uuid4(),
        role="user",
        secret=SECRET,
        algorithm="HS256",
        expires_in=timedelta(days=36500),
        now=datetime.now(UTC),
    )
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(token, secret="y" * 40, algorithm="HS256")


def test_decode_access_token_garbage_raises() -> None:
    with pytest.raises(InvalidAccessTokenError):
        decode_access_token("lixo", secret=SECRET, algorithm="HS256")
