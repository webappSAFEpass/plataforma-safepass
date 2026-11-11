from datetime import datetime
from urllib.parse import quote

from app.contracts import WhatsappData
from app.rules import DIAS, BusinessRules


def within_business_hours(now: datetime, rules: BusinessRules) -> bool:
    """Dia e horário de atendimento das regras, no fuso de `now` (America/Sao_Paulo)."""
    atendimento = rules.atendimento_humano
    return DIAS[now.weekday()] in atendimento.dias and atendimento.abre <= now.time() < atendimento.fecha


def resolve_whatsapp(
    motivo: str,
    nome: str,
    user_id: str,
    now: datetime,
    rules: BusinessRules,
    simulate_after_hours: bool = False,
    simulate_within_hours: bool = False,
) -> WhatsappData:
    """Link do WhatsApp no expediente; fora dele, mensagem para deixar recado.

    As simulações existem para demonstração (forçar um dos dois fluxos a qualquer hora);
    se as duas vierem ligadas, vale "fora do horário".
    """
    atendimento = rules.atendimento_humano
    within = (within_business_hours(now, rules) or simulate_within_hours) and not simulate_after_hours
    if not within:
        return WhatsappData(within_hours=False, message=rules.render(atendimento.mensagem_fora_do_horario))
    texto = rules.render(atendimento.mensagem_whatsapp, nome=nome, id_usuario=user_id, motivo=motivo)
    link = f"https://wa.me/{atendimento.whatsapp}?text={quote(texto)}"
    return WhatsappData(within_hours=True, link=link, message=texto)
