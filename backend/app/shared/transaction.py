from collections.abc import Callable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import conflict


def commit[T](session: Session, action: Callable[[], T]) -> T:
    """Keep atomicity and translate database constraints without exposing SQL."""
    try:
        result = action()
        session.commit()
        return result
    except IntegrityError as exc:
        session.rollback()
        raise conflict("Registro duplicado ou referência incompatível.") from exc
    except Exception:
        session.rollback()
        raise
