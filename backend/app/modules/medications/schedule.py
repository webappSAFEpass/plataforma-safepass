"""Horários das doses e vigência do tratamento, calculados da posologia confirmada."""

import re
from datetime import date, timedelta

DEFAULT_FIRST_DOSE = "08:00"
HOURS_IN_DAY = 24
DAYS_IN_WEEK = 7

_CONDITIONAL = re.compile(r"(?<![-\w])se\s|\bsos\b", re.IGNORECASE)
_INTERVAL = re.compile(
    r"(\d+)\s*/\s*\d+\s*h|cada\s+(\d+)\s*h|de\s+(\d+)\s+em\s+\d+\s*h", re.IGNORECASE
)
_PER_DAY = re.compile(
    r"(\d+|uma|duas|tr[eê]s|quatro)\s*(?:x|vez(?:es)?)\s*(?:ao|por)\s*dia", re.IGNORECASE
)
_ONCE_A_DAY = re.compile(r"\b(?:ao|por)\s+dia\b", re.IGNORECASE)  # "1 cp ao dia"
_NUMBERS = {"uma": 1, "duas": 2, "tres": 3, "três": 3, "quatro": 4}
# "À noite" cai às 20:00, o mesmo horário da 2ª dose de 12/12h começando às 08:00.
_MOMENTS = (
    (re.compile(r"manh[ãa]", re.IGNORECASE), "08:00"),
    (re.compile(r"noite|deitar", re.IGNORECASE), "20:00"),
)
_DURATION = re.compile(r"(\d+)\s*(dia|semana)", re.IGNORECASE)


def daily_times(posology: str, first_dose: str = DEFAULT_FIRST_DOSE) -> list[str]:
    """Horários "HH:MM" do dia, com o intervalo começando em `first_dose`.

    Posologia condicional ("se necessário") ou sem frequência diária devolve [] — não
    inventa horário. Momentos fixos ("pela manhã", "à noite") ignoram `first_dose`.
    """
    if _CONDITIONAL.search(posology):
        return []

    if match := _PER_DAY.search(posology):
        times = _NUMBERS.get(match.group(1).lower()) or int(match.group(1))
    else:
        times = 1 if _ONCE_A_DAY.search(posology) else 0
    moments = [hour for pattern, hour in _MOMENTS if pattern.search(posology)]

    if match := _INTERVAL.search(posology):
        interval = int(next(group for group in match.groups() if group))
    elif moments and times <= 1:
        return moments
    elif times:
        interval = HOURS_IN_DAY // times if 0 < times <= HOURS_IN_DAY else 0
    else:
        return []

    if not 0 < interval <= HOURS_IN_DAY:
        return []
    hour, minute = first_dose.split(":")
    return [
        f"{(int(hour) + offset) % HOURS_IN_DAY:02d}:{minute}"
        for offset in range(0, HOURS_IN_DAY, interval)
    ]


def duration_days(period: str) -> int | None:
    """Dias escritos no período da receita ("7 dias", "2 semanas"); None se não houver."""
    if match := _DURATION.search(period or ""):
        days = int(match.group(1))
        return days * DAYS_IN_WEEK if match.group(2).lower() == "semana" else days
    return None


def is_active(start: date, duration: int | None, ended_on: date | None, today: date) -> bool:
    return (
        start <= today
        and (ended_on is None or ended_on > today)
        and (duration is None or today < start + timedelta(days=duration))
    )


def is_last_day(start: date, duration: int | None, today: date) -> bool:
    return duration is not None and today == start + timedelta(days=duration - 1)
