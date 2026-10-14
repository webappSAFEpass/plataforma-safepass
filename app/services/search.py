"""Busca de prestadores em linguagem natural: filtros tolerantes a acento, radical e sinônimo."""

import re

from app.contracts import Provider, ProviderFilters
from app.rules import UFS, BuscaPrestadores
from app.services.text import normalize

_STOPWORDS = {"de", "da", "do", "das", "dos", "em", "para", "pra", "com", "e", "o", "a", "um", "uma", "no", "na"}


def _stems(text: str, sinonimos: dict[str, str]) -> list[str]:
    """Tokens com radical curto: "cardiologista" e "Cardiologia" viram "cardio"."""
    tokens = []
    for raw in re.findall(r"[a-z0-9+]+", normalize(text)):
        if raw in _STOPWORDS:
            continue
        token = sinonimos.get(raw, raw)
        tokens.append(token[:6])
    return tokens


def _all_match(wanted: str, haystack: str, sinonimos: dict[str, str]) -> bool:
    words = [w[:6] for w in re.findall(r"[a-z0-9+]+", normalize(haystack))]
    return all(
        any(w.startswith(s) or (s.startswith(w) and len(w) >= 4) for w in words) for s in _stems(wanted, sinonimos)
    )


def _location_match(wanted: str, localizacao: str | None, cidades: dict[str, str]) -> bool:
    loc = normalize(localizacao or "")
    w = normalize(wanted)
    if not w:
        return True
    uf = w.upper() if w.upper() in UFS and len(w) == 2 else cidades.get(w)
    loc_uf = (localizacao or "").strip()[-2:].upper()
    if len(w) == 2:
        return uf is not None and loc_uf == uf
    # Cidade exata no texto ("Brasília, DF") ou registro só com a UF ("SP").
    return w in loc or (uf is not None and loc == uf.lower())


def filter_providers(providers: list[Provider], f: ProviderFilters, busca: BuscaPrestadores) -> list[Provider]:
    sinonimos, cidades = busca.sinonimos, busca.cidades

    def ok(p: Provider) -> bool:
        if f.categoria and not _all_match(f.categoria, p.categoria, sinonimos):
            return False
        if f.especialidade and not _all_match(
            f.especialidade, " ".join([p.categoria, *p.tags, p.descricao or "", p.nome]), sinonimos
        ):
            return False
        # Atendimento online não depende de onde o prestador está: a cidade só filtra o presencial.
        if f.cidade and f.modalidade != "online" and not _location_match(f.cidade, p.localizacao, cidades):
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
