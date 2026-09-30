import hmac
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings

_bearer = HTTPBearer(auto_error=False)


class ServiceScope:
    """Usuários que o token de serviço pode ler. Fora do escopo → 404 (não revela existência)."""

    def __init__(self, users: set[str]) -> None:
        self.users = users

    def check(self, user_id: str) -> str:
        if "*" not in self.users and user_id not in self.users:
            raise HTTPException(status_code=404, detail="recurso não encontrado")
        return user_id


def _settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def require_service_token(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    settings: Annotated[Settings, Depends(_settings)],
) -> ServiceScope:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="token de serviço ausente")
    for token, users in settings.token_scopes().items():
        if hmac.compare_digest(creds.credentials.encode(), token.encode()):
            return ServiceScope(users)
    raise HTTPException(status_code=401, detail="token de serviço inválido")
