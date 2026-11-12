"""Contrato do Repository: a MESMA suíte roda no MemoryRepository e no PostgresRepository.

Postgres: defina TEST_DATABASE_URL (ex.: `./scripts/local_test_db.sh start`; no CI, serviço pgvector).
O banco é APAGADO e recriado: só aceita bancos cujo nome termina em `_test` e que não sejam Supabase.
"""

import os
import re
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest

from app.contracts import ProviderFilters
from app.repos.base import MessageRow, Repository
from app.repos.memory import MemoryRepository
from app.seed import data
from app.services.search import filter_providers
from tests.conftest import RULES

ROOT = Path(__file__).resolve().parent.parent
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")


def _safe_test_url(url: str) -> bool:
    return bool(url) and "supabase" not in url and re.search(r"/[\w-]+_test(\?|$)", url) is not None


async def _prepare_postgres(url: str) -> bool:
    """Recria o schema do squad + migrações + dados fictícios. Retorna se o pgvector existe."""
    import asyncpg

    conn = await asyncpg.connect(url)
    try:
        await conn.execute("drop schema public cascade; create schema public;")
        has_vector = bool(await conn.fetchval("select 1 from pg_available_extensions where name = 'vector'"))
        await conn.execute((ROOT / "tests/fixtures/squad_schema.sql").read_text())
        for sql in sorted((ROOT / "migrations").glob("*.sql")):
            text = sql.read_text()
            if not has_vector:  # Postgres local sem pgvector: a coluna vira texto e o RAG é pulado
                text = text.replace("create extension if not exists vector;", "").replace("vector(1536)", "text")
            await conn.execute(text)
        await _insert(conn, "planos", [{k: v for k, v in p.items()} for p in data.PLANOS])
        await _insert(conn, "usuario", data.USUARIOS)
        await _insert(conn, "dependente", data.DEPENDENTES)
        await _insert(conn, "pet", data.PETS)
        await _insert(conn, "prestador", data.PRESTADORES)
        await _insert(conn, "documento", [{**d, "seed": True} for d in data.DOCUMENTOS])
        for table in ("planos", "usuario", "dependente", "pet", "prestador", "documento"):
            await conn.execute(f"select setval(pg_get_serial_sequence('{table}', 'id'), (select max(id) from {table}))")
        return has_vector
    finally:
        await conn.close()


async def _insert(conn: Any, table: str, rows: list[dict[str, Any]]) -> None:
    cols = list(rows[0])
    placeholders = ", ".join(f"${i + 1}" for i in range(len(cols)))
    values = [
        tuple(
            date.fromisoformat(v) if isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", v) else v
            for v in (row[c] for c in cols)
        )
        for row in rows
    ]
    await conn.executemany(f"insert into {table} ({', '.join(cols)}) values ({placeholders})", values)


@pytest.fixture(params=["memory", "postgres"])
async def repo(request: pytest.FixtureRequest) -> AsyncIterator[Repository]:
    if request.param == "memory":
        yield MemoryRepository()
        return
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL não definido (./scripts/local_test_db.sh start)")
    if not _safe_test_url(TEST_DATABASE_URL):
        pytest.fail("TEST_DATABASE_URL precisa apontar para um banco *_test que não seja o Supabase")
    from app.repos.postgres import PostgresRepository

    request.node.has_vector = await _prepare_postgres(TEST_DATABASE_URL)
    pg = await PostgresRepository.connect(TEST_DATABASE_URL)
    try:
        yield pg
    finally:
        await pg.close()


async def test_plans(repo: Repository) -> None:
    plans = {p.id: p for p in await repo.list_plans()}
    assert list(plans) == ["free", "aura", "aura_plus"]
    assert plans["aura_plus"].valor == 97.0 and plans["aura"].qtd_dependentes == 4


async def test_user_profile(repo: Repository) -> None:
    profile = await repo.get_user("1")
    assert profile is not None
    assert profile.model_dump() == {
        "id": "1", "nome": "Ana Beatriz Souza", "plano": "aura_plus", "plano_nome": "SAFEpass Aura+",
        "uf": "DF", "possui_plano_saude": False, "plano_saude": None,
    }  # fmt: skip
    for missing in ("999", "abc", "9999999999", "²"):
        assert await repo.get_user(missing) is None


async def test_dependents_and_pets(repo: Repository) -> None:
    deps = await repo.list_dependents("1")
    assert [(d.id, d.tipo, d.nome) for d in deps] == [
        ("dep_1", "pessoa", "Lucas Souza"), ("dep_2", "pessoa", "Maria Souza"), ("pet_1", "pet", "Thor"),
    ]  # fmt: skip
    assert deps[2].especie == "Cachorro" and deps[0].data_nascimento == "2018-05-14"
    assert [d.id for d in await repo.list_dependents("2")] == ["dep_3", "pet_2"]


async def test_documents(repo: Repository) -> None:
    docs = await repo.list_documents("1", None)
    assert {d.titular_id for d in docs} == {"1", "dep_1", "dep_2", "pet_1"}
    assert {d.titular_nome for d in await repo.list_documents("1", "pet_1")} == {"Thor"}
    assert {d.titular_nome for d in await repo.list_documents("1", "dep_2")} == {"Maria Souza"}
    # O titular de outra família nunca aparece, mesmo pedindo pelo id dele.
    assert await repo.list_documents("1", "dep_3") == []
    item = next(d for d in docs if d.tipo == "CNH").to_item(date(2026, 8, 20), RULES.documentos.dias_alerta_vencimento)
    assert item.status == "valido" and item.validade == "2026-10-05"


@pytest.mark.parametrize(
    "filters,expected",
    [
        (ProviderFilters(especialidade="cardiologista", cidade="brasilia"), ["CardioVida"]),
        (ProviderFilters(categoria="veterinario", especialidade="dermato"), ["Clínica Pet Derma"]),
        (ProviderFilters(cidade="São Paulo", categoria="dentista"), ["OdontoFamília"]),
        # Online ignora a cidade: a psicóloga 100% online serve para quem está em Brasília.
        (ProviderFilters(categoria="psicologo", cidade="Brasília", modalidade="online"), ["Dra. Ana Luiza Costa"]),
        (ProviderFilters(categoria="psicologo", cidade="Brasília"), []),
    ],
)
async def test_providers(repo: Repository, filters: ProviderFilters, expected: list[str]) -> None:
    found = filter_providers(await repo.list_providers(), filters, RULES.busca_prestadores)
    assert [p.nome for p in found] == expected


async def test_providers_sorted_and_complete(repo: Repository) -> None:
    providers = filter_providers(await repo.list_providers(), ProviderFilters(), RULES.busca_prestadores)
    assert len(providers) == len(data.PRESTADORES)
    assert [p.avaliacao for p in providers] == sorted((p.avaliacao for p in providers), reverse=True)
    assert providers[0].tags and isinstance(providers[0].avaliacao, float)


async def test_lead_conversation_messages_recado(repo: Repository) -> None:
    _lead_id, conversation_id = await repo.create_lead("1", "Ana", "61999990000", "oi")
    conversation = await repo.get_conversation(conversation_id)
    assert conversation is not None and conversation.usuario_id == "1" and conversation.lead_nome == "Ana"
    assert await repo.get_conversation(str(uuid.uuid4())) is None
    assert await repo.get_conversation("nao-e-uuid") is None

    await repo.save_messages(conversation_id, [MessageRow(role="user", content="pergunta 1")])
    await repo.save_messages(
        conversation_id,
        [MessageRow(role="assistant", content="resposta 1", intent="duvida_plataforma", tool_calls=[{"name": "x"}])],
    )
    await repo.save_messages(conversation_id, [MessageRow(role="user", content="pergunta 2")])
    history = await repo.list_messages(conversation_id, 2)
    assert [(m.role, m.content) for m in history] == [("assistant", "resposta 1"), ("user", "pergunta 2")]
    await repo.create_recado(conversation_id, "me liguem")


async def test_consent_lifecycle(repo: Repository) -> None:
    assert await repo.get_consent("1") is None
    granted = datetime(2026, 9, 1, 12, tzinfo=UTC)
    await repo.set_consent("1", granted, origem="botao")
    stored = await repo.get_consent("1")
    assert stored is not None and stored == granted
    await repo.set_consent("1", None, origem="mensagem")
    assert await repo.get_consent("1") is None
    await repo.set_consent("1", None, origem="mensagem")  # revogar de novo não quebra


async def test_postgres_consent_is_audited_and_synced(repo: Repository) -> None:
    if isinstance(repo, MemoryRepository):
        pytest.skip("específico do Postgres (trilha em consentimento_evento + coluna do squad)")
    pool = repo.pool  # type: ignore[attr-defined]
    await repo.set_consent("1", datetime.now(UTC), origem="botao")
    assert await pool.fetchval("select permissao_assistente from usuario where id = 1") is True
    await repo.set_consent("1", None, origem="mensagem")
    events = await pool.fetch("select acao, origem from consentimento_evento where usuario_id = 1 order by id")
    assert [(e["acao"], e["origem"]) for e in events] == [("concedido", "botao"), ("revogado", "mensagem")]
    assert await pool.fetchval("select permissao_assistente from usuario where id = 1") is False


async def test_postgres_document_join_checks_family(repo: Repository) -> None:
    if isinstance(repo, MemoryRepository):
        pytest.skip("específico do Postgres")
    pool = repo.pool  # type: ignore[attr-defined]
    # Linha inconsistente: documento do usuário 1 apontando para um dependente da família 2.
    await pool.execute(
        "insert into documento (usuario_id, titular_tipo, titular_id, tipo) values (1, 'dependente', 3, 'RG')"
    )
    assert "Júlia Mendes" not in {d.titular_nome for d in await repo.list_documents("1", None)}


async def test_postgres_search_knowledge(repo: Repository, request: pytest.FixtureRequest) -> None:
    if isinstance(repo, MemoryRepository):
        assert await repo.search_knowledge([0.0] * 1536, 3) is None
        assert await repo.indexed_knowledge() is None
        return
    if not getattr(request.node, "has_vector", False):
        pytest.skip("pgvector indisponível neste Postgres")
    pool = repo.pool  # type: ignore[attr-defined]
    near, far = [1.0] + [0.0] * 1535, [0.0] * 1535 + [1.0]
    for text, vec in (("perto", near), ("longe", far)):
        await pool.execute(
            "insert into knowledge_chunk (categoria, conteudo, embedding) values ('t', $1, $2::vector)",
            text,
            "[" + ",".join(map(str, vec)) + "]",
        )
    assert (await repo.search_knowledge(near, 1)) == ["perto"]
    assert await repo.indexed_knowledge() == {"perto", "longe"}
