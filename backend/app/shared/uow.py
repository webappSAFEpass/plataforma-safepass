from typing import Protocol


class UnitOfWork(Protocol):
    """Satisfeito por `sqlalchemy.orm.Session`. O service decide quando confirmar."""

    def commit(self) -> None: ...

    def flush(self) -> None: ...
