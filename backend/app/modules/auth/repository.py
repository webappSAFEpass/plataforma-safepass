from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.auth.models import PasswordResetToken, RefreshToken


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add_refresh_token(
        self, *, user_id: UUID, token_hash: str, expires_at: datetime
    ) -> RefreshToken:
        token = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self._db.add(token)
        self._db.flush()
        return token

    def get_refresh_token(self, token_hash: str) -> RefreshToken | None:
        return self._db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    def revoke_all_refresh_tokens(self, user_id: UUID, now: datetime) -> None:
        self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )

    def add_reset_token(
        self, *, user_id: UUID, token_hash: str, expires_at: datetime
    ) -> PasswordResetToken:
        token = PasswordResetToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self._db.add(token)
        self._db.flush()
        return token

    def get_reset_token(self, token_hash: str) -> PasswordResetToken | None:
        return self._db.scalar(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
