"""Endpoints do assistente, chamados pelo servidor do front (Next route handlers)."""

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.assistant.llm import LLMClient, LLMError
from app.assistant.loop import Assistant, CardEvent, Done, Reset, Token, consent_active
from app.config import Settings
from app.contracts import (
    USER_ID_PATTERN,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ConsentRequest,
    ConsentStatus,
    LeadRequest,
    LeadResponse,
    OkResponse,
    RecadoRequest,
)
from app.deps import ChatLimiterDep, LLMDep, RepoDep, RulesDep, ScopeDep, SettingsDep, known_user
from app.repos.base import Conversation, MessageRow, Repository
from app.rules import BusinessRules
from app.security import ServiceScope
from app.services.ratelimit import SlidingWindowLimiter
from app.services.text import clean_name, mask_phone

router = APIRouter(tags=["assistente"])
log = logging.getLogger("safepass.chat")

# Histórico enviado ao LLM: lido do banco (o cliente não é fonte confiável), com teto de custo.
HISTORY_LIMIT = 20
HISTORY_CHAR_BUDGET = 16_000


async def _own_conversation(repo: Repository, user_id: str, conversation_id: str) -> Conversation:
    conversation = await repo.get_conversation(conversation_id)
    if conversation is None or conversation.usuario_id != user_id:
        raise HTTPException(status_code=404, detail="conversa não encontrada")
    return conversation


@router.post("/leads", status_code=status.HTTP_201_CREATED)
async def create_lead(body: LeadRequest, scope: ScopeDep, repo: RepoDep) -> LeadResponse:
    user_id = await known_user(repo, scope, body.user_id)
    lead_id, conversation_id = await repo.create_lead(user_id, clean_name(body.nome), body.telefone, body.mensagem)
    log.info("lead criado lead=%s telefone=%s", lead_id, mask_phone(body.telefone))
    return LeadResponse(lead_id=lead_id, conversation_id=conversation_id)


async def _history(repo: Repository, body: ChatRequest) -> tuple[list[ChatMessage], ChatMessage | None]:
    """Histórico gravado + a pergunta nova (ou, em retry, a última pergunta já gravada)."""
    stored = [
        ChatMessage(role=m.role, content=m.content)
        for m in await repo.list_messages(body.conversation_id, HISTORY_LIMIT)
    ]
    new: ChatMessage | None = None
    if body.retry:
        # Reprocessa a última pergunta (ex.: após autorizar o consentimento), sem gravá-la de novo.
        while stored and stored[-1].role != "user":
            stored.pop()
        if not stored:
            raise HTTPException(status_code=422, detail="nada para reprocessar nesta conversa")
    else:
        new = body.messages[-1]
        if new.role != "user":
            raise HTTPException(status_code=422, detail="a última mensagem precisa ser do usuário")
        stored.append(new)
    # Corta as mais antigas até caber no orçamento (a última sempre fica).
    while len(stored) > 1 and sum(len(m.content) for m in stored) > HISTORY_CHAR_BUDGET:
        stored.pop(0)
    return stored, new


async def _prepare(
    body: ChatRequest,
    scope: ServiceScope,
    repo: Repository,
    llm: LLMClient,
    settings: Settings,
    rules: BusinessRules,
    limiter: SlidingWindowLimiter,
) -> tuple[Assistant, list[ChatMessage]]:
    user_id = await known_user(repo, scope, body.user_id)
    conversation = await _own_conversation(repo, user_id, body.conversation_id)
    if not llm.configured:
        raise HTTPException(status_code=503, detail="IA não configurada (LLM_API_KEY)")
    if not limiter.allow(body.conversation_id):
        raise HTTPException(status_code=429, detail="muitas mensagens seguidas; aguarde um instante")
    history, new = await _history(repo, body)
    if new is not None:
        # Grava a pergunta antes de chamar a IA: não se perde se o cliente desconectar no meio.
        await repo.save_messages(body.conversation_id, [MessageRow(role="user", content=new.content)])
    # Nome do lead gravado na conversa, nunca o do corpo da requisição (vai para o system prompt).
    assistant = Assistant(
        repo=repo,
        llm=llm,
        settings=settings,
        rules=rules,
        user_id=user_id,
        lead_nome=clean_name(conversation.lead_nome),
        simulate_after_hours=body.simulate_after_hours,
        simulate_within_hours=body.simulate_within_hours,
    )
    return assistant, history


async def _persist_reply(repo: Repository, conversation_id: str, result: ChatResponse) -> None:
    row = MessageRow(
        role="assistant",
        content=result.reply,
        intent=result.debug.intent,
        tool_calls=[t.model_dump() for t in result.debug.tool_calls],
    )
    try:
        # shield: se o cliente desconectar agora, a gravação termina mesmo assim.
        await asyncio.shield(repo.save_messages(conversation_id, [row]))
    except Exception as exc:  # gravação não pode derrubar a resposta
        log.error("falha ao gravar mensagens: %s", type(exc).__name__)


@router.post("/chat")
async def chat(
    body: ChatRequest,
    scope: ScopeDep,
    repo: RepoDep,
    llm: LLMDep,
    settings: SettingsDep,
    rules: RulesDep,
    limiter: ChatLimiterDep,
) -> ChatResponse:
    assistant, history = await _prepare(body, scope, repo, llm, settings, rules, limiter)
    result: ChatResponse | None = None
    try:
        async with asyncio.timeout(settings.chat_timeout_s):
            async for event in assistant.events(history, stream=False):
                if isinstance(event, Done):
                    result = event.response
    except LLMError as exc:
        log.error("erro no LLM: %s", exc)
        raise HTTPException(status_code=502, detail="falha ao consultar a IA") from exc
    except TimeoutError as exc:
        log.error("chat excedeu %ss", settings.chat_timeout_s)
        raise HTTPException(status_code=504, detail="a IA demorou demais para responder") from exc
    if result is None:
        raise HTTPException(status_code=502, detail="falha ao consultar a IA")
    await _persist_reply(repo, body.conversation_id, result)
    log.info(
        "chat intent=%s tools=%d latency_ms=%d",
        result.debug.intent,
        len(result.debug.tool_calls),
        result.debug.latency_ms,
    )
    return result


def _sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream", response_class=StreamingResponse)
async def chat_stream(
    body: ChatRequest,
    scope: ScopeDep,
    repo: RepoDep,
    llm: LLMDep,
    settings: SettingsDep,
    rules: RulesDep,
    limiter: ChatLimiterDep,
) -> StreamingResponse:
    """SSE: `token` (pedaço de texto), `reset` (descartar o texto já recebido), `card` (Card),
    `done` (ChatResponse final — o front deve exibir `reply` dele), `error`."""
    assistant, history = await _prepare(body, scope, repo, llm, settings, rules, limiter)

    async def generate() -> AsyncIterator[str]:
        # Os headers 200 já saíram: toda falha precisa virar um evento `error`, nunca um corte seco.
        try:
            async with asyncio.timeout(settings.chat_timeout_s):
                async for event in assistant.events(history, stream=True):
                    if isinstance(event, Token):
                        yield _sse("token", {"text": event.text})
                    elif isinstance(event, Reset):
                        yield _sse("reset", {})
                    elif isinstance(event, CardEvent):
                        yield _sse("card", event.card.model_dump(by_alias=True))
                    elif isinstance(event, Done):
                        await _persist_reply(repo, body.conversation_id, event.response)
                        log.info(
                            "chat/stream intent=%s latency_ms=%d",
                            event.response.debug.intent,
                            event.response.debug.latency_ms,
                        )
                        yield _sse("done", event.response.model_dump(by_alias=True))
        except LLMError as exc:
            log.error("erro no LLM: %s", exc)
            yield _sse("error", {"error": "falha ao consultar a IA"})
        except TimeoutError:
            log.error("chat/stream excedeu %ss", settings.chat_timeout_s)
            yield _sse("error", {"error": "a IA demorou demais para responder"})
        except Exception as exc:
            log.error("erro inesperado no chat/stream: %s", type(exc).__name__)
            yield _sse("error", {"error": "erro interno"})

    return StreamingResponse(
        generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.post("/recados", status_code=status.HTTP_201_CREATED)
async def create_recado(body: RecadoRequest, scope: ScopeDep, repo: RepoDep) -> OkResponse:
    user_id = await known_user(repo, scope, body.user_id)
    await _own_conversation(repo, user_id, body.conversation_id)
    await repo.create_recado(body.conversation_id, body.mensagem)
    return OkResponse()


async def _consent_status(repo: Repository, user_id: str, settings: Settings, rules: BusinessRules) -> ConsentStatus:
    granted_at = await repo.get_consent(user_id)  # uma leitura só: sem corrida com uma revogação
    validade_dias = rules.consentimento.validade_dias
    if granted_at is None or not consent_active(granted_at, settings.now(), validade_dias):
        return ConsentStatus(granted=False)
    expires = granted_at + timedelta(days=validade_dias)
    return ConsentStatus(granted=True, granted_at=granted_at.isoformat(), expires_at=expires.isoformat())


@router.get("/consent")
async def get_consent(
    userId: Annotated[str, Query(pattern=USER_ID_PATTERN)],
    scope: ScopeDep,
    repo: RepoDep,
    settings: SettingsDep,
    rules: RulesDep,
) -> ConsentStatus:
    return await _consent_status(repo, await known_user(repo, scope, userId), settings, rules)


@router.post("/consent")
async def set_consent(
    body: ConsentRequest, scope: ScopeDep, repo: RepoDep, settings: SettingsDep, rules: RulesDep
) -> ConsentStatus:
    user_id = await known_user(repo, scope, body.user_id)
    await repo.set_consent(user_id, settings.now() if body.action == "grant" else None, origem="botao")
    return await _consent_status(repo, user_id, settings, rules)
