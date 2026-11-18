"""Adapter real do `IdentityGateway`, apoiado nos módulos `auth`/`users`/`subscriptions` (D01).

Valida o JWT de acesso, carrega o usuário do banco (o papel vale a cada requisição) e
resolve o plano da assinatura ativa. Os módulos dos Desafios 02 e 03 só enxergam o
`Principal`; nenhum deles importa models do Desafio 01.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import UnauthorizedError, missing
from app.core.security import InvalidAccessTokenError, decode_access_token
from app.integrations.identity import Principal
from app.modules.subscriptions.repository import SubscriptionRepository
from app.modules.users.repository import UserRepository

SESSION_EXPIRED_MESSAGE = "Sessão inválida ou expirada."


class AccountIdentity:
    def __init__(self, db: Session, settings: Settings) -> None:
        self._users = UserRepository(db)
        self._subscriptions = SubscriptionRepository(db)
        self._settings = settings

    def authenticate(self, credential: str) -> Principal:
        try:
            payload = decode_access_token(
                credential,
                secret=self._settings.jwt_secret,
                algorithm=self._settings.jwt_algorithm,
            )
        except InvalidAccessTokenError as exc:
            raise UnauthorizedError(SESSION_EXPIRED_MESSAGE) from exc
        user = self._users.get_by_id(payload.user_id)
        if user is None or not user.is_active:
            raise UnauthorizedError(SESSION_EXPIRED_MESSAGE)
        subscription = self._subscriptions.get_active_for_user(user.id)
        return Principal(
            user_id=user.id,
            roles=frozenset({user.role}),
            plan_id=subscription.plan_id if subscription else None,
        )

    def require_user(self, user_id: UUID) -> None:
        user = self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise missing()
