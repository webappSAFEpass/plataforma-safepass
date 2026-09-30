import re
import unicodedata
from datetime import date

from app.contracts import DocumentStatus, PlanId, Provider, ProviderFilters


def normalize(value: str) -> str:
    """Remove acentos, caixa e espaços extras — "Brasília " == "brasilia"."""
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").lower().strip()


def plan_slug(nome: str) -> PlanId:
    """"SAFEpass Aura+" → "aura_plus"."""
    n = normalize(nome).replace("safepass", "").strip()
    if n.endswith("+"):
        return "aura_plus"
    return "aura" if n == "aura" else "free"


def uf_from_address(endereco: str | None) -> str | None:
    """"Rua Tiradentes, 789, Centro - PE" → "PE"."""
    m = re.search(r"-\s*([A-Za-z]{2})\s*$", endereco or "")
    return m.group(1).upper() if m else None


def document_status(validade: date | None, today: date) -> DocumentStatus:
    """vencido = antes de hoje; vencendo = até 30 dias; valido = resto ou sem validade."""
    if validade is None:
        return "valido"
    days = (validade - today).days
    if days < 0:
        return "vencido"
    if days <= 30:
        return "vencendo"
    return "valido"


# ---- Busca de prestadores (linguagem natural → filtros tolerantes) ----

_STOPWORDS = {"de", "da", "do", "das", "dos", "em", "para", "pra", "com", "e", "o", "a", "um", "uma", "no", "na"}
# Termos informais → termo presente nas tags/categorias da base.
_SYNONYMS = {
    "cachorro": "caes", "cachorros": "caes", "cao": "caes", "cadela": "caes", "cachorra": "caes",
    "gata": "gatos", "gato": "gatos", "pet": "veterinario", "pets": "veterinario", "animal": "veterinario",
    "vet": "veterinario", "dermato": "dermatologia", "psico": "psicologo", "nutri": "nutricionista",
    "fisio": "fisioterapeuta", "odonto": "dentista", "terapia": "terapia",
}
_CITY_UF = {
    "sao paulo": "SP", "campinas": "SP", "rio de janeiro": "RJ", "belo horizonte": "MG", "salvador": "BA",
    "brasilia": "DF", "recife": "PE", "porto alegre": "RS", "goiania": "GO", "fortaleza": "CE",
    "curitiba": "PR", "belem": "PA", "florianopolis": "SC", "manaus": "AM", "natal": "RN",
}
_UFS = set(_CITY_UF.values()) | {"AC", "AL", "AP", "ES", "MA", "MT", "MS", "PB", "PI", "RO", "RR", "SE", "TO"}


def _stems(text: str) -> list[str]:
    """Tokens com radical curto: "cardiologista" e "Cardiologia" viram "cardio"."""
    tokens = []
    for raw in re.findall(r"[a-z0-9+]+", normalize(text)):
        if raw in _STOPWORDS:
            continue
        token = _SYNONYMS.get(raw, raw)
        tokens.append(token[:6])
    return tokens


def _all_match(wanted: str, haystack: str) -> bool:
    words = [w[:6] for w in re.findall(r"[a-z0-9+]+", normalize(haystack))]
    return all(any(w.startswith(s) or s.startswith(w) and len(w) >= 4 for w in words) for s in _stems(wanted))


def _location_match(wanted: str, localizacao: str | None) -> bool:
    loc = normalize(localizacao or "")
    w = normalize(wanted)
    if not w:
        return True
    uf = w.upper() if w.upper() in _UFS and len(w) == 2 else _CITY_UF.get(w)
    loc_uf = (localizacao or "").strip()[-2:].upper()
    if len(w) == 2:
        return uf is not None and loc_uf == uf
    # Cidade exata no texto ("Brasília, DF") ou registro só com a UF ("SP").
    return w in loc or (uf is not None and loc == uf.lower())


def filter_providers(providers: list[Provider], f: ProviderFilters) -> list[Provider]:
    def ok(p: Provider) -> bool:
        if f.categoria and not _all_match(f.categoria, p.categoria):
            return False
        if f.especialidade and not _all_match(
            f.especialidade, " ".join([p.categoria, *p.tags, p.descricao or "", p.nome])
        ):
            return False
        if f.cidade and not _location_match(f.cidade, p.localizacao):
            return False
        if f.modalidade:
            mod = normalize(p.modalidade or "")
            if mod != f.modalidade and mod != "hibrido":
                return False
        return True

    return sorted(
        (p for p in providers if ok(p)),
        key=lambda p: (p.avaliacao or 0, p.qtd_avaliacoes or 0),
        reverse=True,
    )


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
