"""Prepara o Supabase para o assistente. Não altera os dados do squad (usuario, prestador, ...).

    python -m scripts.db migrate            # cria as tabelas do assistente e liga RLS (migrations/*.sql)
    python -m scripts.db documents --yes    # recria SÓ os documentos fictícios (seed = true)
    python -m scripts.db ingest-kb --yes    # recria knowledge_chunk + embeddings (EMBEDDINGS_API_KEY)
    python -m scripts.db all --yes          # os três

Comandos que apagam dados exigem --yes (o banco é compartilhado com o squad).
"""

import asyncio
import sys
from pathlib import Path

import asyncpg
import httpx

from app.assistant.llm import LLMClient
from app.assistant.prompt import knowledge_chunks
from app.config import get_settings
from app.repos.memory import plan_from_row
from app.seed import documents

ROOT = Path(__file__).resolve().parent.parent


async def migrate(conn: asyncpg.Connection) -> None:
    for sql in sorted((ROOT / "migrations").glob("*.sql")):
        await conn.execute(sql.read_text())
        print(f"migração aplicada: {sql.name}")


async def seed_documents(conn: asyncpg.Connection) -> None:
    usuarios = [r["id"] for r in await conn.fetch("select id from usuario")]
    deps = [(r["id"], r["usuario_id"]) for r in await conn.fetch("select id, usuario_id from dependente")]
    pets = [(r["id"], r["usuario_id"]) for r in await conn.fetch("select id, usuario_id from pet")]
    rows = documents.generate(usuarios, deps, pets, get_settings().today())
    async with conn.transaction():
        # Só os fictícios: documentos reais (OCR, Desafio 04) têm seed = false e nunca são tocados.
        await conn.execute("delete from documento where seed")
        await conn.executemany(
            "insert into documento (usuario_id, titular_tipo, titular_id, tipo, validade, observacao, seed)"
            " values ($1, $2, $3, $4, $5, $6, true)",
            rows,
        )
    print(f"documentos fictícios: {len(rows)}")


async def ingest_kb(conn: asyncpg.Connection) -> None:
    settings = get_settings()
    if not settings.embeddings_api_key:
        print("EMBEDDINGS_API_KEY ausente: pulando RAG (o assistente usa a base completa no prompt)")
        return
    plans = [plan_from_row(dict(r)) for r in await conn.fetch("select * from planos order by id")]
    async with httpx.AsyncClient() as http:
        llm = LLMClient(settings, http)
        rows = []
        for categoria, conteudo in knowledge_chunks(plans):
            embedding = await llm.embed(conteudo)
            rows.append((categoria, conteudo, "[" + ",".join(map(str, embedding)) + "]"))
    async with conn.transaction():
        await conn.execute("delete from knowledge_chunk")
        await conn.executemany(
            "insert into knowledge_chunk (categoria, conteudo, embedding) values ($1, $2, $3::vector)", rows
        )
    print(f"RAG: {len(rows)} trechos indexados")


DESTRUCTIVE = {"documents", "ingest-kb", "all"}


async def main(command: str) -> None:
    settings = get_settings()
    if not settings.database_url:
        sys.exit("Defina DATABASE_URL no .env (connection string do Supabase).")
    conn = await asyncpg.connect(settings.database_url, statement_cache_size=0)
    try:
        steps = {"migrate": [migrate], "documents": [seed_documents], "ingest-kb": [ingest_kb],
                 "all": [migrate, seed_documents, ingest_kb]}[command]
        for step in steps:
            await step(conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    command = args[0] if args else ""
    if command not in {"migrate", "documents", "ingest-kb", "all"}:
        sys.exit(__doc__)
    if command in DESTRUCTIVE and "--yes" not in args:
        sys.exit(f"'{command}' apaga e recria dados no banco compartilhado. Rode de novo com --yes.")
    asyncio.run(main(command))
