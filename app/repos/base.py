from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Protocol

from app.contracts import Dependent, DocumentItem, Plan, Provider, ProviderFilters, UserProfile
from app.domain.documents import document_status


@dataclass
class Conversation:
    usuario_id: str
    lead_nome: str


@dataclass
class RawDocument:
    id: str
    titular_id: str
    titular_nome: str
    tipo: str
    validade: date | None
    observacao: str | None

    def to_item(self, today: date) -> DocumentItem:
        return DocumentItem(
            id=self.id,
            titular_id=self.titular_id,
            titular_nome=self.titular_nome,
            tipo=f"{self.tipo} ({self.observacao})" if self.observacao else self.tipo,
            validade=self.validade.isoformat() if self.validade else None,
            status=document_status(self.validade, today),
        )


@dataclass
class MessageRow:
    role: str
    content: str
    intent: str | None = None
    tool_calls: list[dict[str, Any]] | None = None


class Repository(Protocol):
    """Consultas de pessoa sempre recebem o userId dono da família — nunca há busca global."""

    async def list_plans(self) -> list[Plan]: ...
    async def get_user(self, user_id: str) -> UserProfile | None: ...
    async def list_dependents(self, user_id: str) -> list[Dependent]: ...
    async def list_documents(self, user_id: str, titular_id: str | None) -> list[RawDocument]: ...
    async def list_providers(self, filters: ProviderFilters) -> list[Provider]: ...

    async def create_lead(self, user_id: str, nome: str, telefone: str, mensagem: str) -> tuple[str, str]: ...
    async def get_conversation(self, conversation_id: str) -> Conversation | None: ...
    async def save_messages(self, conversation_id: str, rows: list[MessageRow]) -> None: ...
    async def create_recado(self, conversation_id: str, mensagem: str) -> None: ...

    async def list_messages(self, conversation_id: str, limit: int) -> list[MessageRow]:
        """Últimas `limit` mensagens da conversa, em ordem cronológica."""
        ...

    async def get_consent(self, user_id: str) -> datetime | None: ...
    async def set_consent(self, user_id: str, granted_at: datetime | None, origem: str) -> None:
        """Atualiza o estado e registra um evento append-only (origem: botao, mensagem, api)."""
        ...

    async def search_knowledge(self, embedding: list[float], k: int) -> list[str] | None:
        """None = busca vetorial indisponível (usa a base inteira)."""
        ...

    async def close(self) -> None: ...
