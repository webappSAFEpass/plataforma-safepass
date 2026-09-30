from datetime import datetime
from urllib.parse import quote

from app.contracts import WhatsappData

AFTER_HOURS_MESSAGE = (
    "Nosso atendimento humano funciona de segunda a sexta, das 8h às 18h. "
    "Deixe seu recado que retornamos no próximo horário útil."
)


def within_business_hours(now: datetime) -> bool:
    """Seg–sex, 8h–18h no fuso de `now` (America/Sao_Paulo)."""
    return now.weekday() < 5 and 8 <= now.hour < 18


def resolve_whatsapp(
    motivo: str, nome: str, user_id: str, now: datetime, number: str, simulate_after_hours: bool
) -> WhatsappData:
    if simulate_after_hours or not within_business_hours(now):
        return WhatsappData(within_hours=False, message=AFTER_HOURS_MESSAGE)
    texto = f"Olá! Sou {nome} (ID {user_id}). Vim do Assistente SAFEpass. Assunto: {motivo}."
    return WhatsappData(within_hours=True, link=f"https://wa.me/{number}?text={quote(texto)}", message=texto)
