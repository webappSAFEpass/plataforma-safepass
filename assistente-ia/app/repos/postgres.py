import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any

import asyncpg

from app.contracts import Dependent, Plan, Provider, UserProfile
from app.domain.ids import parse_user_id, titular_key
from app.repos.base import Conversation, MessageRow, RawDocument
from app.repos.mapping import plan_from_row, profile_from_row, provider_from_row

CATALOG_TTL_S = 300


class _Cached[T]:
    """Valor com TTL; o lock evita que requisições simultâneas recarreguem juntas na expiração."""

    def __init__(self, loader: Callable[[], Awaitable[T]], ttl_s: float) -> None:
        self._loader = loader
        self._ttl_s = ttl_s
        self._value: tuple[float, T] | None = None
        self._lock = asyncio.Lock()

    async def get(self) -> T:
        if self._value and time.monotonic() - self._value[0] < self._ttl_s:
            return self._value[1]
        async with self._lock:
            if not self._value or time.monotonic() - self._value[0] >= self._ttl_s:
                self._value = (time.monotonic(), await self._loader())
            return self._value[1]


class PostgresRepository:
    """Supabase: lê as tabelas do squad (usuario, dependente, pet, planos, prestador) e grava
    as tabelas do assistente (documento, lead, conversa, mensagem, recado, consentimento)."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool
        # Catálogos pequenos e raramente alterados: planos (3) e prestadores (~500).
        self._plans = _Cached(self._load_plans, CATALOG_TTL_S)
        self._providers = _Cached(self._load_providers, CATALOG_TTL_S)

    @classmethod
    async def connect(cls, dsn: str) -> "PostgresRepository":
        # statement_cache_size=0 mantém compatibilidade com o pooler do Supabase.
        pool = await asyncpg.create_pool(dsn, min_size=1, max_size=5, statement_cache_size=0)
        return cls(pool)

    async def close(self) -> None:
        await self.pool.close()

    async def _load_plans(self) -> dict[int, dict[str, Any]]:
        return {r["id"]: dict(r) for r in await self.pool.fetch("select * from planos")}

    async def _load_providers(self) -> list[Provider]:
        rows = await self.pool.fetch(
            "select id, nome, categoria, registro_profissional, telefone, descricao_atendimento,"
            " tags_atendimento, modalidade_atendimento, localizacao_atendimento, faixa_preco,"
            " avaliacao, qtd_avaliacoes from prestador"
        )
        return [provider_from_row(dict(r)) for r in rows]

    async def list_plans(self) -> list[Plan]:
        plans = await self._plans.get()
        return [plan_from_row(p) for p in sorted(plans.values(), key=lambda p: p["id"])]

    async def get_user(self, user_id: str) -> UserProfile | None:
        uid = parse_user_id(user_id)
        if uid is None:
            return None
        row = await self.pool.fetchrow(
            "select id, nome, endereco, possui_plano_saude, plano_saude, plano_safepass_id from usuario where id = $1",
            uid,
        )
        return profile_from_row(dict(row), await self._plans.get()) if row else None

    async def list_dependents(self, user_id: str) -> list[Dependent]:
        uid = parse_user_id(user_id)
        if uid is None:
            return []
        deps = await self.pool.fetch(
            "select id, nome, data_nascimento from dependente where usuario_id = $1 order by id", uid
        )
        pets = await self.pool.fetch(
            "select id, nome, data_nascimento, especie, raca from pet where usuario_id = $1 order by id", uid
        )
        return [
            Dependent(
                id=f"dep_{r['id']}",
                nome=r["nome"],
                tipo="pessoa",
                data_nascimento=r["data_nascimento"].isoformat() if r["data_nascimento"] else None,
            )
            for r in deps
        ] + [
            Dependent(
                id=f"pet_{r['id']}",
                nome=r["nome"] or "Pet",
                tipo="pet",
                data_nascimento=r["data_nascimento"].isoformat() if r["data_nascimento"] else None,
                especie=r["especie"],
                raca=r["raca"],
            )
            for r in pets
        ]

    async def list_documents(self, user_id: str, titular_id: str | None) -> list[RawDocument]:
        uid = parse_user_id(user_id)
        if uid is None:
            return []
        rows = await self.pool.fetch(
            """
            select d.id, d.titular_tipo, d.titular_id, d.tipo, d.validade, d.observacao,
                   coalesce(u.nome, dep.nome, p.nome) as titular_nome
            from documento d
            -- O titular precisa ser da mesma família do dono do documento (defesa contra linha inconsistente).
            left join usuario u on d.titular_tipo = 'usuario' and u.id = d.titular_id and u.id = d.usuario_id
            left join dependente dep on d.titular_tipo = 'dependente' and dep.id = d.titular_id
                                    and dep.usuario_id = d.usuario_id
            left join pet p on d.titular_tipo = 'pet' and p.id = d.titular_id and p.usuario_id = d.usuario_id
            where d.usuario_id = $1 and coalesce(u.id, dep.id, p.id) is not null
            order by d.id
            """,
            uid,
        )
        docs = [
            RawDocument(
                id=str(r["id"]),
                titular_id=titular_key(r["titular_tipo"], r["titular_id"]),
                titular_nome=r["titular_nome"] or "",
                tipo=r["tipo"],
                validade=r["validade"],
                observacao=r["observacao"],
            )
            for r in rows
        ]
        return [d for d in docs if titular_id is None or d.titular_id == titular_id]

    async def list_providers(self) -> list[Provider]:
        # Filtro tolerante em Python (services.search). Catálogo grande → SQL com unaccent/pg_trgm.
        return list(await self._providers.get())

    async def create_lead(self, user_id: str, nome: str, telefone: str, mensagem: str) -> tuple[str, str]:
        uid = parse_user_id(user_id)
        async with self.pool.acquire() as conn, conn.transaction():
            lead_id = await conn.fetchval(
                "insert into lead (usuario_id, nome, telefone, mensagem_inicial) values ($1, $2, $3, $4) returning id",
                uid,
                nome,
                telefone,
                mensagem,
            )
            conversation_id = await conn.fetchval(
                "insert into conversa (lead_id, usuario_id) values ($1, $2) returning id", lead_id, uid
            )
        return str(lead_id), str(conversation_id)

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        try:
            row = await self.pool.fetchrow(
                "select c.usuario_id, l.nome from conversa c join lead l on l.id = c.lead_id where c.id = $1::uuid",
                conversation_id,
            )
        except (asyncpg.DataError, asyncpg.InvalidTextRepresentationError):
            return None
        if row is None or row["usuario_id"] is None:
            return None
        return Conversation(usuario_id=str(row["usuario_id"]), lead_nome=row["nome"])

    async def save_messages(self, conversation_id: str, rows: list[MessageRow]) -> None:
        await self.pool.executemany(
            "insert into mensagem (conversa_id, role, content, intent, tool_calls)"
            " values ($1::uuid, $2, $3, $4, $5::jsonb)",
            [
                (
                    conversation_id,
                    r.role,
                    r.content,
                    r.intent,
                    json.dumps(r.tool_calls, ensure_ascii=False) if r.tool_calls is not None else None,
                )
                for r in rows
            ],
        )

    async def create_recado(self, conversation_id: str, mensagem: str) -> None:
        await self.pool.execute(
            "insert into recado (lead_id, mensagem) values ((select lead_id from conversa where id = $1::uuid), $2)",
            conversation_id,
            mensagem,
        )

    async def get_consent(self, user_id: str) -> datetime | None:
        granted_at: datetime | None = await self.pool.fetchval(
            "select concedido_em from consentimento where usuario_id = $1 and revogado_em is null",
            parse_user_id(user_id),
        )
        return granted_at

    async def set_consent(self, user_id: str, granted_at: datetime | None, origem: str) -> None:
        uid = parse_user_id(user_id)
        async with self.pool.acquire() as conn, conn.transaction():
            if granted_at is None:
                await conn.execute(
                    "update consentimento set revogado_em = now() where usuario_id = $1 and revogado_em is null", uid
                )
            else:
                await conn.execute(
                    """insert into consentimento (usuario_id, concedido_em) values ($1, $2)
                       on conflict (usuario_id)
                       do update set concedido_em = excluded.concedido_em, revogado_em = null""",
                    uid,
                    granted_at,
                )
            await conn.execute(
                "insert into consentimento_evento (usuario_id, acao, origem, ocorrido_em)"
                " values ($1, $2, $3, coalesce($4, now()))",
                uid,
                "concedido" if granted_at else "revogado",
                origem,
                granted_at,
            )
            # Mantém a coluna do squad em sincronia com o consentimento registrado.
            await conn.execute(
                "update usuario set permissao_assistente = $2 where id = $1", uid, granted_at is not None
            )

    async def list_messages(self, conversation_id: str, limit: int) -> list[MessageRow]:
        rows = await self.pool.fetch(
            "select role, content from (select role, content, created_at from mensagem where conversa_id = $1::uuid"
            " order by created_at desc limit $2) m order by created_at",
            conversation_id,
            limit,
        )
        return [MessageRow(role=r["role"], content=r["content"]) for r in rows]

    async def search_knowledge(self, embedding: list[float], k: int) -> list[str] | None:
        vector = "[" + ",".join(f"{x:.7f}" for x in embedding) + "]"
        rows = await self.pool.fetch(
            "select conteudo from knowledge_chunk where embedding is not null"
            " order by embedding <=> $1::vector limit $2",
            vector,
            k,
        )
        return [r["conteudo"] for r in rows] or None

    async def indexed_knowledge(self) -> set[str] | None:
        rows = await self.pool.fetch("select conteudo from knowledge_chunk where embedding is not null")
        return {r["conteudo"] for r in rows} or None
