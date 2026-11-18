import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING, Protocol
from uuid import UUID

from app.core.email import EmailDeliveryError, EmailSender
from app.core.security import (
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    verify_dummy_password,
    verify_password,
)
from app.modules.auth.exceptions import (
    EmailAlreadyRegisteredError,
    InvalidAccountTypeError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidResetTokenError,
)
from app.shared.clock import Clock
from app.shared.roles import SELF_REGISTRATION_ROLES, Role
from app.shared.uow import UnitOfWork

if TYPE_CHECKING:
    from app.core.config import Settings
    from app.modules.auth.repository import AuthRepository
    from app.modules.users.models import User
    from app.modules.users.repository import UserRepository

logger = logging.getLogger(__name__)


class FreePlanAssigner(Protocol):
    """Implementado por SubscriptionService. Não faz commit (a transação é do AuthService)."""

    def assign_free_plan(self, user_id: UUID) -> None: ...


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str


@dataclass(frozen=True)
class AuthResult:
    user: "User"
    tokens: IssuedTokens


def normalize_email(email: str) -> str:
    return email.strip().lower()


class AuthService:
    def __init__(
        self,
        users: "UserRepository",
        tokens: "AuthRepository",
        free_plan: FreePlanAssigner,
        email: EmailSender,
        uow: UnitOfWork,
        clock: Clock,
        settings: "Settings",
    ) -> None:
        self._users = users
        self._tokens = tokens
        self._free_plan = free_plan
        self._email = email
        self._uow = uow
        self._clock = clock
        self._settings = settings

    def register(
        self, *, full_name: str, email: str, password: str, account_type: str
    ) -> AuthResult:
        role = Role(account_type)
        if role not in SELF_REGISTRATION_ROLES:
            raise InvalidAccountTypeError()
        normalized = normalize_email(email)
        if self._users.get_by_email(normalized) is not None:
            raise EmailAlreadyRegisteredError()

        user = self._users.add(
            email=normalized,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
        )
        if role is Role.USER:
            self._free_plan.assign_free_plan(user.id)
        tokens = self._issue_tokens(user)
        self._uow.commit()
        return AuthResult(user=user, tokens=tokens)

    def login(self, *, email: str, password: str) -> AuthResult:
        user = self._users.get_by_email(normalize_email(email))
        if user is None:
            verify_dummy_password(password)
            raise InvalidCredentialsError()
        if not verify_password(user.password_hash, password) or not user.is_active:
            raise InvalidCredentialsError()
        tokens = self._issue_tokens(user)
        self._uow.commit()
        return AuthResult(user=user, tokens=tokens)

    def refresh(self, raw_refresh_token: str) -> AuthResult:
        now = self._clock.now()
        stored = self._tokens.get_refresh_token(hash_token(raw_refresh_token))
        if stored is None:
            raise InvalidRefreshTokenError()
        if stored.revoked_at is not None:
            # Token já rotacionado sendo reapresentado: possível roubo. Derruba todas as sessões.
            self._tokens.revoke_all_refresh_tokens(stored.user_id, now)
            self._uow.commit()
            raise InvalidRefreshTokenError()
        if stored.expires_at <= now:
            raise InvalidRefreshTokenError()
        user = self._users.get_by_id(stored.user_id)
        if user is None or not user.is_active:
            raise InvalidRefreshTokenError()

        stored.revoked_at = now
        tokens = self._issue_tokens(user)
        self._uow.commit()
        return AuthResult(user=user, tokens=tokens)

    def logout(self, raw_refresh_token: str | None) -> None:
        if not raw_refresh_token:
            return
        stored = self._tokens.get_refresh_token(hash_token(raw_refresh_token))
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = self._clock.now()
            self._uow.commit()

    def forgot_password(self, email: str) -> None:
        """Resposta idêntica exista ou não a conta (evita enumeração de e-mails)."""
        user = self._users.get_by_email(normalize_email(email))
        if user is None or not user.is_active:
            return
        raw_token = generate_opaque_token()
        expires_at = self._clock.now() + timedelta(minutes=self._settings.password_reset_minutes)
        self._tokens.add_reset_token(
            user_id=user.id, token_hash=hash_token(raw_token), expires_at=expires_at
        )
        self._uow.commit()

        link = f"{self._settings.frontend_url}/redefinir-senha?token={raw_token}"
        body = (
            f"Olá, {user.full_name}!\n\n"
            "Recebemos um pedido para redefinir a senha da sua conta SAFEpass.\n"
            f"Acesse o link abaixo em até {self._settings.password_reset_minutes} minutos:\n\n"
            f"{link}\n\n"
            "Se não foi você, ignore este e-mail."
        )
        try:
            self._email.send(to=user.email, subject="Recuperação de senha — SAFEpass", body=body)
        except EmailDeliveryError:
            logger.warning("Falha ao enviar e-mail de recuperação de senha.")

    def reset_password(self, *, token: str, new_password: str) -> None:
        now = self._clock.now()
        stored = self._tokens.get_reset_token(hash_token(token))
        if stored is None or stored.used_at is not None or stored.expires_at <= now:
            raise InvalidResetTokenError()
        user = self._users.get_by_id(stored.user_id)
        if user is None:
            raise InvalidResetTokenError()

        user.password_hash = hash_password(new_password)
        stored.used_at = now
        self._tokens.revoke_all_refresh_tokens(user.id, now)
        self._uow.commit()

    def _issue_tokens(self, user: "User") -> IssuedTokens:
        now = self._clock.now()
        access = create_access_token(
            user_id=user.id,
            role=user.role,
            secret=self._settings.jwt_secret,
            algorithm=self._settings.jwt_algorithm,
            expires_in=timedelta(minutes=self._settings.access_token_minutes),
            now=now,
        )
        raw_refresh = generate_opaque_token()
        self._tokens.add_refresh_token(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=now + timedelta(days=self._settings.refresh_token_days),
        )
        return IssuedTokens(access_token=access, refresh_token=raw_refresh)
