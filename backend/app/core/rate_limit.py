import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.exceptions import TooManyRequestsError


class SlidingWindowLimiter:
    """Limitador em memória (suficiente para 1 instância; trocar por Redis se escalar)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, *, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request, settings: Settings) -> str:
    if settings.trust_forwarded_for:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, *, limit: int, window_seconds: int) -> Callable[..., None]:
    def dependency(request: Request, settings: Settings = Depends(get_settings)) -> None:
        key = f"{bucket}:{client_ip(request, settings)}"
        if not limiter.allow(key, limit=limit, window_seconds=window_seconds):
            raise TooManyRequestsError()

    return dependency
