"""Logs (texto ou JSON) com request id. Nunca registrar corpo, query string, headers ou PII."""

import json
import logging
import re
import uuid
from contextvars import ContextVar

request_id: ContextVar[str] = ContextVar("request_id", default="-")

_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")


def incoming_request_id(header: str | None) -> str:
    """Reaproveita o X-Request-ID do chamador (Next) se for seguro; senão gera um novo."""
    return header if header and _VALID_REQUEST_ID.fullmatch(header) else uuid.uuid4().hex


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "msg": record.getMessage(),
        }
        if record.exc_info:
            entry["exc_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
        return json.dumps(entry, ensure_ascii=False)


def configure_logging(json_logs: bool, level: str) -> None:
    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())
    handler.setFormatter(
        JsonFormatter()
        if json_logs
        else logging.Formatter("%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s")
    )
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level.upper())
