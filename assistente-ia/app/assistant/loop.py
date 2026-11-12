"""Orquestração do assistente: rodadas de tool calling sobre um LLM compatível com OpenAI."""

import json
import logging
import re
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from app.assistant.fallback import resolve_whatsapp
from app.assistant.llm import LLMClient, LLMError, LLMMessage, Turn
from app.assistant.prompt import RAG_INSTRUCTION, build_system_prompt, knowledge_chunks, knowledge_text
from app.assistant.tools import SPECS, TOOLS, ToolName, tool_error
from app.config import Settings
from app.contracts import (
    Card,
    ChatDebug,
    ChatMessage,
    ChatResponse,
    ConsentCard,
    ConsentData,
    DocumentsCard,
    Intent,
    ProviderFilters,
    ProvidersCard,
    ToolCallLog,
    WhatsappCard,
)
from app.repos.base import Repository
from app.rules import BusinessRules
from app.services.search import filter_providers
from app.services.text import normalize

log = logging.getLogger("safepass.assistant")

MAX_TOOL_ROUNDS = 3
# Prestadores enviados ao modelo e ao card (a base tem centenas).
MAX_PROVIDERS = 6
# Revogação só com comando explícito ("Revogar consentimento de dados", "quero revogar meu consentimento").
# Perguntas ("como faço para revogar...?") e negações ("não quero revogar...") seguem para o LLM.
_REVOKE_COMMAND = re.compile(
    r"(?:(?:eu|por favor|quero|desejo|gostaria de|pode|favor)\s+)*"
    r"revogar\s+(?:o\s+|a\s+|meu\s+|minha\s+)*(?:consentimento|autorizacao|permissao)"
    r"(?:\s+(?:de|do|dos|para|ao|uso|dados|meus|assistente|o|uso\s+dos?))*"
)

_WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
_MONTHS = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]


def format_date_pt(now: datetime) -> str:
    return f"{_WEEKDAYS[now.weekday()]}, {now.day} de {_MONTHS[now.month - 1]} de {now.year}"


def _compact(text: str) -> str:
    return re.sub(r"\s+", " ", normalize(text)).strip()


def is_revoke_request(text: str) -> bool:
    if "?" in text:
        return False
    return _REVOKE_COMMAND.fullmatch(_compact(re.sub(r"[,.!;:]+", " ", text))) is not None


def consent_active(granted_at: datetime | None, now: datetime, validade_dias: int) -> bool:
    return bool(granted_at and granted_at + timedelta(days=validade_dias) > now)


# ---- Eventos emitidos por Assistant.events() ----


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
ToolResult = tuple[object, Card | None]
_TOOL_NAMES = {str(t) for t in ToolName}


@dataclass
class _RunState:
    """Acumulado de uma resposta: cards, ferramentas chamadas e intenção."""

    fallback_reply: str
    started: float = field(default_factory=time.monotonic)
    cards: list[Card] = field(default_factory=list)
    tool_log: list[ToolCallLog] = field(default_factory=list)
    intent: Intent = "conversa_geral"

    def add_card(self, card: Card) -> bool:
        # Um único pedido de consentimento por resposta, mesmo se várias ferramentas o exigirem.
        if card.type == "consent" and any(c.type == "consent" for c in self.cards):
            return False
        self.cards.append(card)
        return True

    def done(self, reply: str) -> Done:
        return Done(
            ChatResponse(
                reply=reply or self.fallback_reply,
                cards=self.cards,
                debug=ChatDebug(
                    intent=self.intent,
                    tool_calls=self.tool_log,
                    latency_ms=int((time.monotonic() - self.started) * 1000),
                ),
            )
        )


@dataclass
class _TurnResult:
    turn: Turn | None = None
    streamed: bool = False  # algum texto desta rodada já foi enviado ao cliente


@dataclass
class Assistant:
    repo: Repository
    llm: LLMClient
    settings: Settings
    rules: BusinessRules
    user_id: str
    lead_nome: str
    simulate_after_hours: bool = False
    simulate_within_hours: bool = False
    _consent: bool | None = field(default=None, init=False)
    _handlers: dict[ToolName, Callable[[dict[str, Any]], Awaitable[ToolResult]]] = field(
        default_factory=dict, init=False
    )

    def __post_init__(self) -> None:
        self._handlers = {
            ToolName.BASE_CONHECIMENTO: self._tool_knowledge,
            ToolName.MINHA_CONTA: self._tool_account,
            ToolName.DEPENDENTES: self._tool_dependents,
            ToolName.DOCUMENTOS: self._tool_documents,
            ToolName.PRESTADORES: self._tool_providers,
            ToolName.WHATSAPP: self._tool_whatsapp,
        }

    # ---- Ferramentas ----

    async def _has_consent(self) -> bool:
        if self._consent is None:
            granted_at = await self.repo.get_consent(self.user_id)
            self._consent = consent_active(granted_at, self.settings.now(), self.rules.consentimento.validade_dias)
        return self._consent

    async def run_tool(self, name: str, args: dict[str, Any]) -> ToolResult:
        try:
            tool = ToolName(name)
        except ValueError:
            return tool_error("ferramenta_desconhecida", "Essa ferramenta não existe."), None
        if SPECS[tool].requires_consent and not await self._has_consent():
            return (
                tool_error(
                    "consentimento_necessario",
                    "O usuário ainda não autorizou o uso dos dados. Não mostre dados; "
                    "peça a autorização no card exibido.",
                ),
                ConsentCard(data=ConsentData(message=self.rules.render(self.rules.consentimento.mensagem_pedido))),
            )
        return await self._handlers[tool](args)

    async def _tool_knowledge(self, args: dict[str, Any]) -> ToolResult:
        pergunta = _str(args.get("pergunta"))
        plans = await self.repo.list_plans()
        if pergunta:
            try:
                indexed = await self.repo.indexed_knowledge()
                if indexed is not None and indexed != {text for _, text in knowledge_chunks(plans, self.rules)}:
                    # Regras ou planos mudaram depois da última ingestão: o índice teria texto velho ou faltando.
                    log.warning("RAG desatualizado (rode scripts.db ingest-kb), usando base completa")
                elif indexed is not None:
                    embedding = await self.llm.embed(pergunta)
                    chunks = await self.repo.search_knowledge(embedding, 3) if embedding else None
                    if chunks:
                        return {"instrucao": RAG_INSTRUCTION, "contexto": chunks}, None
            except Exception as exc:  # RAG indisponível não derruba a conversa
                log.warning("RAG indisponível, usando base completa: %s", type(exc).__name__)
        return {"instrucao": RAG_INSTRUCTION, "contexto": knowledge_text(plans, self.rules)}, None

    async def _tool_account(self, _: dict[str, Any]) -> ToolResult:
        profile = await self.repo.get_user(self.user_id)
        if profile is None:
            return tool_error("conta_nao_encontrada", "Não encontrei a conta do usuário."), None
        return profile.model_dump(by_alias=True), None

    async def _tool_dependents(self, _: dict[str, Any]) -> ToolResult:
        return [d.model_dump(by_alias=True) for d in await self.repo.list_dependents(self.user_id)], None

    async def _tool_documents(self, args: dict[str, Any]) -> ToolResult:
        titular_id: str | None = None
        nome = _str(args.get("nome_dependente"))
        if nome:
            matches = await self._resolve_titular(nome)
            if not matches:
                return tool_error(
                    "sem_permissao",
                    "Esse nome não pertence ao usuário logado nem aos dependentes dele. "
                    "Recuse educadamente por privacidade.",
                ), None
            if len(matches) > 1:
                return tool_error(
                    "nome_ambiguo",
                    "Mais de uma pessoa da família combina com esse nome. Pergunte qual destas: "
                    + ", ".join(name for _, name in matches)
                    + ".",
                ), None
            titular_id = matches[0][0]
        today = self.settings.today()
        dias_alerta = self.rules.documentos.dias_alerta_vencimento
        docs = [d.to_item(today, dias_alerta) for d in await self.repo.list_documents(self.user_id, titular_id)]
        return [d.model_dump(by_alias=True) for d in docs], DocumentsCard(data=docs)

    async def _tool_providers(self, args: dict[str, Any]) -> ToolResult:
        modalidade = args.get("modalidade")
        filters = ProviderFilters(
            categoria=_str(args.get("categoria")),
            especialidade=_str(args.get("especialidade")),
            cidade=_str(args.get("cidade")),
            modalidade=modalidade if modalidade in ("presencial", "online") else None,
        )
        found = filter_providers(await self.repo.list_providers(), filters, self.rules.busca_prestadores)
        top = found[:MAX_PROVIDERS]
        content = {
            "total_encontrado": len(found),
            # Sem telefone/descrição: o modelo não precisa deles, o card mostra.
            "prestadores": [
                p.model_dump(
                    by_alias=True,
                    include={"nome", "categoria", "tags", "modalidade", "localizacao", "faixa_preco", "avaliacao"},
                )
                for p in top
            ],
        }
        return content, ProvidersCard(data=top, total=len(found))

    async def _tool_whatsapp(self, args: dict[str, Any]) -> ToolResult:
        result = resolve_whatsapp(
            motivo=_str(args.get("motivo")) or "atendimento",
            nome=self.lead_nome,
            user_id=self.user_id,
            now=self.settings.now(),
            rules=self.rules,
            simulate_after_hours=self.simulate_after_hours,
            simulate_within_hours=self.simulate_within_hours,
        )
        return result.model_dump(by_alias=True), WhatsappCard(data=result)

    async def _resolve_titular(self, nome: str) -> list[tuple[str, str]]:
        """Nome → [(id, nome)], só entre o usuário e a família dele. Exato vence; senão, todos os parciais."""
        wanted = _compact(nome)
        people = [(d.id, d.nome) for d in await self.repo.list_dependents(self.user_id)]
        profile = await self.repo.get_user(self.user_id)
        if profile:
            people.append((profile.id, profile.nome))
        exact = [p for p in people if _compact(p[1]) == wanted]
        if exact:
            return exact[:1]
        return [p for p in people if wanted in _compact(p[1]).split() or _compact(p[1]).startswith(wanted)]

    # ---- Rodadas ----

    async def events(self, history: list[ChatMessage], stream: bool) -> AsyncIterator[Event]:
        state = _RunState(fallback_reply=self.rules.render(self.rules.assistente.mensagem_sem_resposta))
        last = history[-1]
        if last.role == "user" and is_revoke_request(last.content):
            await self.repo.set_consent(self.user_id, None, origem="mensagem")
            self._consent = False
            reply = self.rules.render(self.rules.consentimento.mensagem_revogacao)
            yield Token(reply)
            yield state.done(reply)
            return

        messages: list[LLMMessage] = [
            {"role": "system", "content": build_system_prompt(self.lead_nome, format_date_pt(self.settings.now()))},
            *({"role": m.role, "content": m.content} for m in history),
        ]
        reply = ""
        retried = False
        round_ = 0
        while round_ <= MAX_TOOL_ROUNDS:
            tools = TOOLS if round_ < MAX_TOOL_ROUNDS else None  # última rodada força resposta em texto
            result = _TurnResult()
            try:
                async for token in self._turn(messages, tools, stream, result):
                    yield token
            except LLMError as exc:
                # Falha pontual (chamada de ferramenta malformada, conexão): tenta a rodada mais uma vez.
                if retried or not exc.retryable:
                    raise
                log.warning("rodada do LLM falhou, repetindo: %s", exc)
            turn = result.turn
            if turn is not None and turn.tool_calls and tools is None:
                turn = Turn(content=turn.content)  # rodada final é só texto: ignora ferramentas pedidas
            if turn is None or turn.is_empty:
                if result.streamed:
                    yield Reset()
                if retried:
                    break
                retried = True
                continue
            if not turn.tool_calls:
                reply = turn.content
                if not stream:
                    yield Token(reply)
                break
            if result.streamed:
                yield Reset()  # "Vou verificar..." antes das ferramentas não é a resposta final
            round_ += 1
            async for card_event in self._run_calls(turn, messages, state):
                yield card_event

        if not reply:
            yield Token(state.fallback_reply)
        yield state.done(plain_text(reply))

    async def _turn(
        self, messages: list[LLMMessage], tools: list[dict[str, Any]] | None, stream: bool, out: _TurnResult
    ) -> AsyncIterator[Token]:
        """Uma chamada ao LLM. Em streaming, repassa o texto; o Turn completo fica em `out`."""
        if not stream:
            out.turn = await self.llm.complete(messages, tools)
            return
        async for chunk in self.llm.stream(messages, tools):
            if isinstance(chunk, Turn):
                out.turn = chunk
            else:
                out.streamed = True
                yield Token(chunk)

    async def _run_calls(self, turn: Turn, messages: list[LLMMessage], state: _RunState) -> AsyncIterator[CardEvent]:
        """Executa as ferramentas pedidas e devolve os resultados ao histórico do modelo."""
        messages.append(turn.as_message())
        for call in turn.tool_calls:
            args = _parse_args(call.arguments)
            state.tool_log.append(ToolCallLog(name=call.name, args=args))
            if call.name in _TOOL_NAMES:
                state.intent = SPECS[ToolName(call.name)].intent
            content, card = await self.run_tool(call.name, args)
            if card and state.add_card(card):
                yield CardEvent(card)
            messages.append(
                {"role": "tool", "tool_call_id": call.id, "content": json.dumps(content, ensure_ascii=False)}
            )


def _parse_args(raw: str) -> dict[str, Any]:
    try:
        args = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return args if isinstance(args, dict) else {}


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
