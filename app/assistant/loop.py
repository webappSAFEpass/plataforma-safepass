"""Orquestração do assistente — porta de safepass-buddy/src/lib/safepass/chat.server.ts."""

import json
import logging
import re
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.assistant.fallback import resolve_whatsapp
from app.assistant.llm import LLMClient, LLMError, Turn
from app.assistant.prompt import RAG_INSTRUCTION, build_system_prompt, knowledge_text
from app.assistant.tools import INTENT_BY_TOOL, PRIVATE_TOOLS, TOOLS
from app.config import Settings
from app.contracts import (
    Card,
    ChatDebug,
    ChatMessage,
    ChatResponse,
    ConsentCard,
    ConsentData,
    DocumentsCard,
    ProviderFilters,
    ProvidersCard,
    ToolCallLog,
    WhatsappCard,
)
from app.repos.base import Repository
from app.services.text import normalize

log = logging.getLogger("safepass.assistant")

MAX_TOOL_ROUNDS = 3
# Prestadores enviados ao modelo e ao card (a base tem centenas).
MAX_PROVIDERS = 6
FALLBACK_REPLY = "Não consegui responder agora. Posso te encaminhar ao atendimento humano?"
CONSENT_MESSAGE = (
    "Para responder a esta solicitação, precisamos processar seus dados cadastrais e de seus "
    "dependentes. Você autoriza a consulta pelo assistente virtual?"
)
REVOKE_REPLY = (
    "Pronto, revoguei sua autorização. Não vou mais consultar seus dados cadastrais nem os dos seus "
    "dependentes até você autorizar de novo."
)
# Revogação só com comando explícito ("Revogar consentimento de dados", "quero revogar meu consentimento").
# Perguntas ("como faço para revogar...?") e negações ("não quero revogar...") seguem para o LLM.
_REVOKE_COMMAND = re.compile(
    r"(?:(?:eu|por favor|quero|desejo|gostaria de|pode|favor)\s+)*"
    r"revogar\s+(?:o\s+|a\s+|meu\s+|minha\s+)*(?:consentimento|autorizacao|permissao)"
    r"(?:\s+(?:de|do|dos|para|ao|uso|dados|meus|assistente|o|uso\s+dos?))*"
)

_WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
           "setembro", "outubro", "novembro", "dezembro"]


def format_date_pt(now: datetime) -> str:
    return f"{_WEEKDAYS[now.weekday()]}, {now.day} de {_MONTHS[now.month - 1]} de {now.year}"


def is_revoke_request(text: str) -> bool:
    if "?" in text:
        return False
    t = re.sub(r"[,.!;:]+", " ", normalize(text))
    return _REVOKE_COMMAND.fullmatch(re.sub(r"\s+", " ", t).strip()) is not None


def consent_active(granted_at: datetime | None, settings: Settings) -> bool:
    return bool(granted_at and granted_at + timedelta(days=settings.consent_valid_days) > settings.now())


@dataclass
class Token:
    text: str


@dataclass
class CardEvent:
    card: Card


@dataclass
class Reset:
    """O texto transmitido até aqui foi descartado (rodada com ferramentas ou repetida): limpar a bolha."""


@dataclass
class Done:
    response: ChatResponse


Event = Token | Reset | CardEvent | Done


@dataclass
class Assistant:
    repo: Repository
    llm: LLMClient
    settings: Settings
    user_id: str
    lead_nome: str
    simulate_after_hours: bool = False
    _consent: bool | None = field(default=None, init=False)

    async def _has_consent(self) -> bool:
        if self._consent is None:
            self._consent = consent_active(await self.repo.get_consent(self.user_id), self.settings)
        return self._consent

    async def run_tool(self, name: str, args: dict) -> tuple[object, Card | None]:
        if name in PRIVATE_TOOLS and not await self._has_consent():
            return (
                {"erro": "consentimento_necessario",
                 "detalhe": "O usuário ainda não autorizou o uso dos dados. Não mostre dados; peça a autorização no card exibido."},
                ConsentCard(data=ConsentData(message=CONSENT_MESSAGE)),
            )

        match name:
            case "consultar_base_conhecimento":
                return await self._knowledge(str(args.get("pergunta") or "")), None

            case "consultar_minha_conta":
                profile = await self.repo.get_user(self.user_id)
                return (profile.model_dump(by_alias=True) if profile else {"erro": "conta não encontrada"}), None

            case "consultar_dependentes":
                deps = await self.repo.list_dependents(self.user_id)
                return [d.model_dump(by_alias=True) for d in deps], None

            case "consultar_documentos":
                titular_id: str | None = None
                nome = args.get("nome_dependente")
                if isinstance(nome, str) and nome.strip():
                    titular_id = await self._resolve_titular(nome)
                    if titular_id is None:
                        return (
                            {"erro": "sem permissão",
                             "detalhe": "Esse nome não pertence ao usuário logado nem aos dependentes dele. Recuse educadamente por privacidade."},
                            None,
                        )
                today = self.settings.today()
                docs = [d.to_item(today) for d in await self.repo.list_documents(self.user_id, titular_id)]
                return [d.model_dump(by_alias=True) for d in docs], DocumentsCard(data=docs)

            case "buscar_prestadores":
                modalidade = args.get("modalidade")
                filters = ProviderFilters(
                    categoria=_str(args.get("categoria")),
                    especialidade=_str(args.get("especialidade")),
                    cidade=_str(args.get("cidade")),
                    modalidade=modalidade if modalidade in ("presencial", "online") else None,
                )
                found = await self.repo.list_providers(filters)
                top = found[:MAX_PROVIDERS]
                content = {
                    "total_encontrado": len(found),
                    "prestadores": [
                        p.model_dump(by_alias=True, include={"nome", "categoria", "tags", "modalidade",
                                                             "localizacao", "faixa_preco", "avaliacao"})
                        for p in top
                    ],
                }
                return content, ProvidersCard(data=top, total=len(found))

            case "encaminhar_whatsapp":
                result = resolve_whatsapp(
                    motivo=_str(args.get("motivo")) or "atendimento",
                    nome=self.lead_nome,
                    user_id=self.user_id,
                    now=self.settings.now(),
                    number=self.settings.whatsapp_number,
                    simulate_after_hours=self.simulate_after_hours,
                )
                return result.model_dump(by_alias=True), WhatsappCard(data=result)

        return {"erro": "ferramenta desconhecida"}, None

    async def _knowledge(self, pergunta: str) -> dict:
        if pergunta:
            try:
                embedding = await self.llm.embed(pergunta)
                chunks = await self.repo.search_knowledge(embedding, 3) if embedding else None
                if chunks:
                    return {"instrucao": RAG_INSTRUCTION, "contexto": chunks}
            except Exception as exc:  # RAG indisponível não derruba a conversa
                log.warning("RAG indisponível, usando base completa: %s", type(exc).__name__)
        return {"instrucao": RAG_INSTRUCTION, "contexto": knowledge_text(await self.repo.list_plans())}

    async def _resolve_titular(self, nome: str) -> str | None:
        """Nome → id, só entre o próprio usuário e os dependentes dele. Exato primeiro, depois parcial."""
        wanted = normalize(nome)
        people = [(d.id, normalize(d.nome)) for d in await self.repo.list_dependents(self.user_id)]
        profile = await self.repo.get_user(self.user_id)
        if profile:
            people.append((profile.id, normalize(profile.nome)))
        for pid, pname in people:
            if pname == wanted:
                return pid
        for pid, pname in people:
            if wanted in pname.split() or pname.startswith(wanted):
                return pid
        return None

    async def events(self, history: list[ChatMessage], stream: bool) -> AsyncIterator[Event]:
        started = time.monotonic()
        cards: list[Card] = []
        tool_log: list[ToolCallLog] = []
        intent = "conversa_geral"

        def done(reply: str) -> Done:
            return Done(ChatResponse(
                reply=reply or FALLBACK_REPLY,
                cards=cards,
                debug=ChatDebug(intent=intent, tool_calls=tool_log,
                                latency_ms=int((time.monotonic() - started) * 1000)),
            ))

        last = history[-1]
        if last.role == "user" and is_revoke_request(last.content):
            await self.repo.set_consent(self.user_id, None, origem="mensagem")
            self._consent = False
            yield Token(REVOKE_REPLY)
            yield done(REVOKE_REPLY)
            return

        messages: list[dict] = [
            {"role": "system", "content": build_system_prompt(self.lead_nome, format_date_pt(self.settings.now()))},
            *({"role": m.role, "content": m.content} for m in history),
        ]

        reply = ""
        retried = False
        round_ = 0
        while round_ <= MAX_TOOL_ROUNDS:
            tools = TOOLS if round_ < MAX_TOOL_ROUNDS else None  # última rodada força resposta em texto
            turn: Turn | None = None
            streamed = False
            try:
                if stream:
                    async for chunk in self.llm.stream(messages, tools):
                        if isinstance(chunk, Turn):
                            turn = chunk
                        else:
                            streamed = True
                            yield Token(chunk)
                else:
                    turn = await self.llm.complete(messages, tools)
            except LLMError as exc:
                # Falha pontual (chamada de ferramenta malformada, conexão): tenta a rodada mais uma vez.
                if retried or not exc.retryable:
                    raise
                log.warning("rodada do LLM falhou, repetindo: %s", exc)
            if turn is not None and turn.tool_calls and tools is None:
                # Rodada final é só texto: ferramentas pedidas mesmo assim são ignoradas.
                turn = Turn(content=turn.content)
            if turn is None or (not turn.tool_calls and not turn.content.strip()):
                if streamed:
                    yield Reset()
                if not retried:
                    retried = True
                    continue
                break

            if turn.tool_calls and streamed:
                yield Reset()  # "Vou verificar..." antes das ferramentas não é a resposta final

            if not turn.tool_calls:
                reply = turn.content
                if not stream and reply:
                    yield Token(reply)
                break

            round_ += 1
            messages.append(turn.as_message())
            consent_card_sent = any(c.type == "consent" for c in cards)
            for call in turn.tool_calls:
                try:
                    args = json.loads(call.arguments or "{}")
                    if not isinstance(args, dict):
                        args = {}
                except json.JSONDecodeError:
                    args = {}
                tool_log.append(ToolCallLog(name=call.name, args=args))
                intent = INTENT_BY_TOOL.get(call.name, intent)
                content, card = await self.run_tool(call.name, args)
                if card and not (card.type == "consent" and consent_card_sent):
                    consent_card_sent = consent_card_sent or card.type == "consent"
                    cards.append(card)
                    yield CardEvent(card)
                messages.append({"role": "tool", "tool_call_id": call.id,
                                 "content": json.dumps(content, ensure_ascii=False)})

        if not reply:
            yield Token(FALLBACK_REPLY)
        yield done(plain_text(reply))


_MD_BULLET = re.compile(r"(?m)^[ \t]*(?:[-*•]|\d+[.)])[ \t]+")
_MD_HEADING = re.compile(r"(?m)^[ \t]*#+[ \t]*")


def plain_text(text: str) -> str:
    """Remove markdown que o modelo às vezes usa apesar da instrução (negrito, títulos, marcadores)."""
    text = text.replace("**", "").replace("__", "")
    text = _MD_HEADING.sub("", text)
    text = _MD_BULLET.sub("", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _str(value: object) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None
