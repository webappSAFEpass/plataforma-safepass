"""Regras de documento (validade e status)."""

from datetime import date

from app.contracts import DocumentStatus


def document_status(validade: date | None, today: date, dias_alerta: int) -> DocumentStatus:
    """vencido = antes de hoje; vencendo = até `dias_alerta` dias; valido = resto ou sem validade."""
    if validade is None:
        return "valido"
    days = (validade - today).days
    if days < 0:
        return "vencido"
    if days <= dias_alerta:
        return "vencendo"
    return "valido"
