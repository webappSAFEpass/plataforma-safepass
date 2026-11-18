from dataclasses import dataclass

from fastapi import Query
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.shared.schemas import Page

__all__ = ["Page", "PageParams", "page_params", "paginate"]

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


@dataclass(frozen=True)
class PageParams:
    page: int
    size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


def page_params(
    page: int = Query(1, ge=1),
    size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
) -> PageParams:
    return PageParams(page=page, size=size)


def paginate[M: Base](
    session: Session, query: Select[tuple[M]], page: int, size: int
) -> tuple[list[M], int]:
    total = session.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    items = list(session.scalars(query.offset((page - 1) * size).limit(size)).unique())
    return items, total
