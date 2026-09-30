"""Ids públicos da API: usuário "89", dependente "dep_3", pet "pet_7"."""

import re


def titular_key(tipo: str, titular_id: int) -> str:
    """Id público de quem é o documento: "12" (usuário), "dep_3" ou "pet_7"."""
    return {"usuario": str(titular_id), "dependente": f"dep_{titular_id}", "pet": f"pet_{titular_id}"}[tipo]


_USER_ID = re.compile(r"[1-9][0-9]{0,9}")
PG_INT_MAX = 2_147_483_647


def parse_user_id(user_id: str) -> int | None:
    """ "89" → 89. Rejeita dígitos Unicode ("²"), zeros à esquerda e valores fora do int4."""
    if not _USER_ID.fullmatch(user_id):
        return None
    value = int(user_id)
    return value if value <= PG_INT_MAX else None
