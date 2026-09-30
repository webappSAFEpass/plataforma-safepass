"""Regras de documento (validade e status)."""

from datetime import date

from app.contracts import DocumentStatus

# Mesma janela dos alertas de vencimento prometidos na base de conhecimento.
EXPIRY_WARNING_DAYS = 30


def document_status(validade: date | None, today: date) -> DocumentStatus:
    """vencido = antes de hoje; vencendo = até EXPIRY_WARNING_DAYS; valido = resto ou sem validade."""
    if validade is None:
        return "valido"
    days = (validade - today).days
    if days < 0:
        return "vencido"
    if days <= EXPIRY_WARNING_DAYS:
        return "vencendo"
    return "valido"
