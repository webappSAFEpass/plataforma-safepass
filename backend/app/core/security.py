import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

ACCESS_TOKEN_TYPE = "access"

_hasher = PasswordHasher()  # Argon2id com parâmetros padrão seguros


class InvalidAccessTokenError(Exception):
    """Token ausente de claims, expirado, adulterado ou de outro tipo."""


@dataclass(frozen=True)
class AccessTokenPayload:
    user_id: UUID
    role: str


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    return _hasher.hash("safepass-dummy-password")


def verify_dummy_password(password: str) -> None:
    """Gasta o mesmo tempo de uma verificação real, para não revelar se o e-mail existe."""
    verify_password(_dummy_hash(), password)


def generate_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Tokens opacos (refresh, recuperação) só são guardados como hash."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(
    *,
    user_id: UUID,
    role: str,
    secret: str,
    algorithm: str,
    expires_in: timedelta,
    now: datetime,
) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str, *, secret: str, algorithm: str) -> AccessTokenPayload:
    try:
        claims = jwt.decode(
            token, secret, algorithms=[algorithm], options={"require": ["exp", "sub"]}
        )
        if claims.get("type") != ACCESS_TOKEN_TYPE:
            raise InvalidAccessTokenError("tipo de token inválido")
        return AccessTokenPayload(user_id=UUID(claims["sub"]), role=str(claims.get("role", "")))
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise InvalidAccessTokenError(str(exc)) from exc
