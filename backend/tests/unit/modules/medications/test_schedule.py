from datetime import date

import pytest

from app.modules.medications.schedule import daily_times, duration_days, is_active, is_last_day

TODAY = date(2026, 11, 15)


@pytest.mark.parametrize(
    ("posology", "expected"),
    [
        ("1 cp 8/8h", ["08:00", "16:00", "00:00"]),
        ("1 comprimido a cada 12 horas", ["08:00", "20:00"]),
        ("tomar de 6 em 6 horas", ["08:00", "14:00", "20:00", "02:00"]),
        ("3x ao dia", ["08:00", "16:00", "00:00"]),
        ("duas vezes ao dia", ["08:00", "20:00"]),
        ("1 cp ao dia", ["08:00"]),
        ("1 comprimido pela manhã", ["08:00"]),
        ("1 cp à noite", ["20:00"]),
        ("se necessário", []),
        ("SOS", []),
        ("1x por semana", []),
        ("", []),
    ],
)
def test_daily_times_from_posology_default_first_dose(posology: str, expected: list[str]) -> None:
    assert daily_times(posology) == expected


@pytest.mark.parametrize(
    ("posology", "first_dose", "expected"),
    [
        ("8/8h", "15:00", ["15:00", "23:00", "07:00"]),
        ("12/12h", "21:30", ["21:30", "09:30"]),
        ("1x ao dia", "22:00", ["22:00"]),
        ("1 cp à noite", "15:00", ["20:00"]),  # momento fixo ignora a 1ª dose
    ],
)
def test_daily_times_interval_starts_at_first_dose(
    posology: str, first_dose: str, expected: list[str]
) -> None:
    assert daily_times(posology, first_dose) == expected


@pytest.mark.parametrize(
    ("period", "expected"),
    [("7 dias", 7), ("por 2 semanas", 14), ("uso contínuo", None), ("", None)],
)
def test_duration_days_reads_period(period: str, expected: int | None) -> None:
    assert duration_days(period) == expected


def test_is_active_respects_start_end_and_duration() -> None:
    assert is_active(date(2026, 11, 10), 7, None, TODAY)
    assert not is_active(date(2026, 11, 1), 7, None, TODAY)  # período vencido
    assert not is_active(date(2026, 11, 16), None, None, TODAY)  # começa amanhã
    assert not is_active(date(2026, 11, 1), None, TODAY, TODAY)  # encerrado hoje
    assert is_active(date(2026, 1, 1), None, date(2026, 11, 16), TODAY)  # encerra amanhã


def test_is_last_day_only_for_treatment_with_duration() -> None:
    assert is_last_day(date(2026, 11, 9), 7, TODAY)
    assert not is_last_day(date(2026, 11, 10), 7, TODAY)
    assert not is_last_day(date(2026, 11, 9), None, TODAY)
