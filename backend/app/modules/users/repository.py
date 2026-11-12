from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.users.models import User
from app.shared.roles import Role


class UserRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_id(self, user_id: UUID) -> User | None:
        return self._db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self._db.scalar(select(User).where(User.email == email))

    def add(self, *, email: str, password_hash: str, full_name: str, role: Role) -> User:
        user = User(email=email, password_hash=password_hash, full_name=full_name, role=role.value)
        self._db.add(user)
        self._db.flush()
        return user

    def count_active_by_role(self, role: Role) -> int:
        stmt = (
            select(func.count())
            .select_from(User)
            .where(User.role == role.value, User.is_active.is_(True))
        )
        return self._db.scalar(stmt) or 0
