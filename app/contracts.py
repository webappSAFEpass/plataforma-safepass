"""Contratos de dados (JSON em camelCase) — espelhados em lib/contracts.ts do front.

Modelados a partir das tabelas reais do Supabase (usuario, dependente, pet, planos, prestador).
Dados sensíveis (CPF, e-mail, endereço completo) nunca saem do backend.
"""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

PlanId = Literal["free", "aura", "aura_plus"]
DocumentStatus = Literal["valido", "vencendo", "vencido"]
Modalidade = Literal["presencial", "online"]
Intent = Literal[
    "duvida_plataforma",
    "consulta_conta",
    "consulta_dependentes",
    "consulta_documentos",
    "busca_prestadores",
    "fallback_whatsapp",
    "conversa_geral",
]


# Formatos de id aceitos na API (validados antes de chegar ao banco).
USER_ID_PATTERN = r"^[1-9][0-9]{0,9}$"
TITULAR_ID_PATTERN = r"^([1-9][0-9]{0,9}|dep_[0-9]{1,10}|pet_[0-9]{1,10})$"
UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"

UserId = Annotated[str, Field(pattern=USER_ID_PATTERN)]
ConversationId = Annotated[str, Field(pattern=UUID_PATTERN)]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Plan(Model):
    id: PlanId
    nome: str
    valor: float
    qtd_dependentes: int
    qtd_avaliacoes_mes: int | None
    acesso_cupom: str | None
    acumulo_ponto: str | None
    historico_saude: bool
    cartao_fisico_beneficios: bool
    checkup_gratuito: bool
    desconto: str | None


class UserProfile(Model):
    id: str
    nome: str
    plano: PlanId
    plano_nome: str
    uf: str | None
    possui_plano_saude: bool | None
    plano_saude: str | None


class Dependent(Model):
    id: str  # "dep_12" (pessoa) ou "pet_5" (pet)
    nome: str
    tipo: Literal["pessoa", "pet"]
    data_nascimento: str | None
    especie: str | None = None
    raca: str | None = None


class DocumentItem(Model):
    id: str
    titular_id: str
    titular_nome: str
    tipo: str
    validade: str | None
    status: DocumentStatus


class Provider(Model):
    id: str
    nome: str
    categoria: str
    registro_profissional: str | None
    descricao: str | None
    tags: list[str]
    modalidade: str | None
    localizacao: str | None
    faixa_preco: str | None
    avaliacao: float | None
    qtd_avaliacoes: int | None
    telefone: str | None


class ProviderFilters(Model):
    categoria: str | None = None
    especialidade: str | None = None
    cidade: str | None = None
    modalidade: Modalidade | None = None


# ---- Cards exibidos pelo front ----


class WhatsappData(Model):
    within_hours: bool
    link: str | None = None
    message: str


class ConsentData(Model):
    message: str


class ProvidersCard(Model):
    type: Literal["providers"] = "providers"
    data: list[Provider]
    total: int


class DocumentsCard(Model):
    type: Literal["documents"] = "documents"
    data: list[DocumentItem]


class WhatsappCard(Model):
    type: Literal["whatsapp"] = "whatsapp"
    data: WhatsappData


class ConsentCard(Model):
    type: Literal["consent"] = "consent"
    data: ConsentData


Card = Annotated[ProvidersCard | DocumentsCard | WhatsappCard | ConsentCard, Field(discriminator="type")]


# ---- Assistente ----


class ChatMessage(Model):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class Lead(Model):
    nome: str = Field(min_length=1, max_length=120)
    telefone: str = Field(max_length=30)


class ChatRequest(Model):
    user_id: UserId
    conversation_id: ConversationId
    # Ignorado: o nome vem do lead gravado na conversa (o corpo não é confiável para o prompt).
    lead: Lead | None = None
    messages: list[ChatMessage] = Field(min_length=1, max_length=50)
    # Demonstração: força o fluxo de atendimento humano fora (recado) ou dentro (link) do horário.
    simulate_after_hours: bool = False
    simulate_within_hours: bool = False
    # True quando o front reenvia o mesmo histórico (ex.: após autorizar o consentimento).
    retry: bool = False


class ToolCallLog(Model):
    name: str
    args: dict[str, Any]


class ChatDebug(Model):
    intent: Intent
    tool_calls: list[ToolCallLog]
    latency_ms: int


class ChatResponse(Model):
    reply: str
    cards: list[Card]
    debug: ChatDebug


class LeadRequest(Model):
    user_id: UserId
    nome: str = Field(min_length=2, max_length=120)
    telefone: str = Field(min_length=8, max_length=30)
    mensagem: str = Field(min_length=1, max_length=4000)


class LeadResponse(Model):
    lead_id: str
    conversation_id: str


class OkResponse(Model):
    ok: bool = True


class RecadoRequest(Model):
    user_id: UserId
    conversation_id: ConversationId
    mensagem: str = Field(min_length=1, max_length=4000)


class ConsentRequest(Model):
    user_id: UserId
    action: Literal["grant", "revoke"]


class ConsentStatus(Model):
    granted: bool
    granted_at: str | None = None
    expires_at: str | None = None
