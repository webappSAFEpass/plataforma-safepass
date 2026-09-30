"""Endpoints do assistente, chamados pelo servidor do front (Next route handlers)."""

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app.assistant.llm import LLMClient, LLMError
from app.assistant.loop import Assistant, CardEvent, Done, Reset, Token, consent_active
from app.config import Settings, get_settings
from app.contracts import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ConsentRequest,
    ConsentStatus,
    LeadRequest,
    USER_ID_PATTERN,
    LeadResponse,
    RecadoRequest,
)
from app.repos.base import Conversation, MessageRow, Repository
from app.security import ServiceScope, get_llm, get_repo, require_service_token
from app.services.text import clean_name, mask_phone

router = APIRouter(tags=["assistente"])
log = logging.getLogger("safepass.chat")

# Histórico enviado ao LLM: lido do banco (o cliente não é fonte confiável), com teto de custo.
HISTORY_LIMIT = 20
HISTORY_CHAR_BUDGET = 16_000


async def _known_user(repo: Repository, scope: ServiceScope, user_id: str) -> str:
    scope.check(user_id)
    if await repo.get_user(user_id) is None:
        raise HTTPException(status_code=404, detail="usuário não encontrado")
    return user_id


async def _own_conversation(repo: Repository, user_id: str, conversation_id: str) -> Conversation:
    conversation = await repo.get_conversation(conversation_id)
    if conversation is None or conversation.usuario_id != user_id:
        raise HTTPException(status_code=404, detail="conversa não encontrada")
    return conversation


@router.post("/leads", response_model=LeadResponse)
async def create_lead(
    body: LeadRequest,
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
) -> LeadResponse:
    user_id = await _known_user(repo, scope, body.user_id)
    lead_id, conversation_id = await repo.create_lead(user_id, clean_name(body.nome), body.telefone, body.mensagem)
    log.info("lead criado lead=%s telefone=%s", lead_id, mask_phone(body.telefone))
    return LeadResponse(lead_id=lead_id, conversation_id=conversation_id)


async def _history(repo: Repository, body: ChatRequest) -> tuple[list[ChatMessage], ChatMessage | None]:
    """Histórico gravado + a pergunta nova (ou, em retry, a última pergunta já gravada)."""
    stored = [ChatMessage(role=m.role, content=m.content)
              for m in await repo.list_messages(body.conversation_id, HISTORY_LIMIT)]
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


async def _prepare(request: Request, body: ChatRequest, scope: ServiceScope, repo: Repository,
                   llm: LLMClient, settings: Settings) -> tuple[Assistant, list[ChatMessage]]:
    user_id = await _known_user(repo, scope, body.user_id)
    conversation = await _own_conversation(repo, user_id, body.conversation_id)
    if not llm.configured:
        raise HTTPException(status_code=503, detail="IA não configurada (LLM_API_KEY)")
    if not request.app.state.chat_limiter.allow(body.conversation_id):
        raise HTTPException(status_code=429, detail="muitas mensagens seguidas; aguarde um instante")
    history, new = await _history(repo, body)
    if new is not None:
        # Grava a pergunta antes de chamar a IA: não se perde se o cliente desconectar no meio.
        await repo.save_messages(body.conversation_id, [MessageRow(role="user", content=new.content)])
    # Nome do lead gravado na conversa, nunca o do corpo da requisição (vai para o system prompt).
    assistant = Assistant(repo=repo, llm=llm, settings=settings, user_id=user_id,
                          lead_nome=clean_name(conversation.lead_nome),
                          simulate_after_hours=body.simulate_after_hours)
    return assistant, history


async def _persist_reply(repo: Repository, conversation_id: str, result: ChatResponse) -> None:
    row = MessageRow(role="assistant", content=result.reply, intent=result.debug.intent,
                     tool_calls=[t.model_dump() for t in result.debug.tool_calls])
    try:
        # shield: se o cliente desconectar agora, a gravação termina mesmo assim.
        await asyncio.shield(repo.save_messages(conversation_id, [row]))
    except Exception as exc:  # gravação não pode derrubar a resposta
        log.error("falha ao gravar mensagens: %s", type(exc).__name__)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    body: ChatRequest,
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
    llm: LLMClient = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    assistant, history = await _prepare(request, body, scope, repo, llm, settings)
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
    log.info("chat intent=%s tools=%d latency_ms=%d", result.debug.intent,
             len(result.debug.tool_calls), result.debug.latency_ms)
    return result


def _sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
    llm: LLMClient = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    """SSE: `token` (pedaço de texto), `reset` (descartar o texto já recebido), `card` (Card),
    `done` (ChatResponse final — o front deve exibir `reply` dele), `error`."""
    assistant, history = await _prepare(request, body, scope, repo, llm, settings)

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
                        log.info("chat/stream intent=%s latency_ms=%d", event.response.debug.intent,
                                 event.response.debug.latency_ms)
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

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/recados")
async def create_recado(
    body: RecadoRequest,
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
) -> dict:
    user_id = await _known_user(repo, scope, body.user_id)
    await _own_conversation(repo, user_id, body.conversation_id)
    await repo.create_recado(body.conversation_id, body.mensagem)
    return {"ok": True}


async def _consent_status(repo: Repository, user_id: str, settings: Settings) -> ConsentStatus:
    granted_at = await repo.get_consent(user_id)  # uma leitura só: sem corrida com uma revogação
    if granted_at is None or not consent_active(granted_at, settings):
        return ConsentStatus(granted=False)
    expires = granted_at + timedelta(days=settings.consent_valid_days)
    return ConsentStatus(granted=True, granted_at=granted_at.isoformat(), expires_at=expires.isoformat())


@router.get("/consent", response_model=ConsentStatus)
async def get_consent(
    userId: str = Query(pattern=USER_ID_PATTERN),
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
    settings: Settings = Depends(get_settings),
) -> ConsentStatus:
    return await _consent_status(repo, await _known_user(repo, scope, userId), settings)


@router.post("/consent", response_model=ConsentStatus)
async def set_consent(
    body: ConsentRequest,
    scope: ServiceScope = Depends(require_service_token),
    repo: Repository = Depends(get_repo),
    settings: Settings = Depends(get_settings),
) -> ConsentStatus:
    user_id = await _known_user(repo, scope, body.user_id)
    await repo.set_consent(user_id, settings.now() if body.action == "grant" else None, origem="botao")
    return await _consent_status(repo, user_id, settings)
