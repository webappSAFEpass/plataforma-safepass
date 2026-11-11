from datetime import datetime

from sqlalchemy import inspect as sa_inspect


class FixedClock:
    def __init__(self, now: datetime):
        self._now = now

    def now(self) -> datetime:
        return self._now


def stamp_record(record: object) -> None:
    """Apply every column's Python-side default (id, timestamps, booleans
    like `active`/`can_redeem_coupons`) that a real session.flush() would
    set, since a mocked repository.add() never actually flushes."""
    for column in sa_inspect(type(record)).columns:
        if column.default is None or getattr(record, column.key, None) is not None:
            continue
        default = column.default.arg
        if not callable(default):
            setattr(record, column.key, default)
            continue
        try:
            value = default()
        except TypeError:
            value = default(None)  # SQLAlchemy context-aware default callables
        setattr(record, column.key, value)
