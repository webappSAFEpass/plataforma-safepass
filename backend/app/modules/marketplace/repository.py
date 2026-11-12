from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.marketplace.models import Favorite
from app.shared.pagination import paginate


class FavoriteRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Favorite) -> None:
        self.session.add(record)
        self.session.flush()

    def get(self, user_id: UUID, provider_id: UUID) -> Favorite | None:
        return self.session.scalar(
            select(Favorite).where(Favorite.user_id == user_id, Favorite.provider_id == provider_id)
        )

    def ids_for_user(self, user_id: UUID) -> set[UUID]:
        return set(
            self.session.scalars(select(Favorite.provider_id).where(Favorite.user_id == user_id))
        )

    def list_for_user(self, user_id: UUID, page: int, size: int) -> tuple[list[Favorite], int]:
        query = (
            select(Favorite)
            .where(Favorite.user_id == user_id)
            .order_by(Favorite.created_at.desc(), Favorite.id)
        )
        return paginate(self.session, query, page, size)

    def remove(self, favorite: Favorite) -> None:
        self.session.delete(favorite)
        self.session.flush()
