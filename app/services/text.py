"""Normalização de texto e higienização (nomes, telefones para log)."""

import re
import unicodedata

from app.contracts import PlanId


def normalize(value: str) -> str:
    """Remove acentos, caixa e espaços extras — "Brasília " == "brasilia"."""
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").lower().strip()


def plan_slug(nome: str) -> PlanId:
    """ "SAFEpass Aura+" → "aura_plus"."""
    n = normalize(nome).replace("safepass", "").strip()
    if n.endswith("+"):
        return "aura_plus"
    return "aura" if n == "aura" else "free"


def uf_from_address(endereco: str | None) -> str | None:
    """ "Rua Tiradentes, 789, Centro - PE" → "PE"."""
    m = re.search(r"-\s*([A-Za-z]{2})\s*$", endereco or "")
    return m.group(1).upper() if m else None


_NAME_UNSAFE = re.compile(r"[^\w\s'.-]")
MAX_NAME_LEN = 60


def clean_name(value: str) -> str:
    """Nome digitado pelo visitante → texto seguro para o prompt e o WhatsApp.

    Remove quebras de linha, controles e pontuação que poderiam simular instruções.
    """
    text = "".join(" " if unicodedata.category(c).startswith("C") else c for c in value)
    text = _NAME_UNSAFE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()[:MAX_NAME_LEN].strip() or "cliente"


_DIGITS = re.compile(r"\d")


def mask_phone(phone: str) -> str:
    """Mantém só os 2 últimos dígitos — para logs."""
    digits = _DIGITS.findall(phone)
    return "*" * max(len(digits) - 2, 0) + "".join(digits[-2:])
