"""Gera documentos fictícios (Desafio 04) para todas as pessoas e pets do banco.

Determinístico por id; validades espalhadas em torno da data de hoje para existirem
documentos válidos, vencendo (≤ 30 dias) e vencidos na demonstração.
"""

from datetime import date, timedelta

PERSON_DOCS = ["CNH", "RG", "Carteirinha SAFEpass"]
DEPENDENT_DOCS = ["RG", "Carteira de vacinação", "Receita de uso contínuo"]
PET_DOCS = ["Carteira de vacinação do pet", "Atestado de saúde animal"]
# Deslocamentos (dias) a partir de hoje: vencido, vencendo, válido longo, válido, sem validade.
OFFSETS = [-20, 12, 400, 180, None]


def _validade(today: date, seed: int, always: bool = False) -> date | None:
    offset = OFFSETS[seed % len(OFFSETS)]
    if offset is None:
        # Documentos de identificação sempre têm validade.
        return today + timedelta(days=730) if always else None
    return today + timedelta(days=offset)


def generate(usuarios: list[int], dependentes: list[tuple[int, int]], pets: list[tuple[int, int]],
             today: date) -> list[tuple]:
    """Linhas (usuario_id, titular_tipo, titular_id, tipo, validade, observacao)."""
    rows: list[tuple] = []
    for uid in usuarios:
        for i, tipo in enumerate(PERSON_DOCS[: 2 + uid % 2]):
            rows.append((uid, "usuario", uid, tipo, _validade(today, uid + i * 2, always=tipo != "Carteirinha SAFEpass"), None))
    for dep_id, uid in dependentes:
        for i, tipo in enumerate(DEPENDENT_DOCS[: 1 + dep_id % 3]):
            validade = _validade(today, dep_id + i)
            obs = f"Próxima dose em {(today + timedelta(days=15)).isoformat()}" if tipo == "Carteira de vacinação" else None
            rows.append((uid, "dependente", dep_id, tipo, None if obs else validade, obs))
    for pet_id, uid in pets:
        for i, tipo in enumerate(PET_DOCS[: 1 + pet_id % 2]):
            rows.append((uid, "pet", pet_id, tipo, _validade(today, pet_id + i + 1), None))
    return rows
