import uuid
from datetime import date, datetime

from app.contracts import Dependent, Plan, Provider, ProviderFilters, UserProfile
from app.repos.base import Conversation, MessageRow, RawDocument, parse_user_id, titular_key
from app.seed import data
from app.services.text import filter_providers, plan_slug, uf_from_address


def plan_from_row(row: dict) -> Plan:
    return Plan(**{**row, "id": plan_slug(row["nome"]), "valor": float(row["valor"])})


def provider_from_row(row: dict) -> Provider:
    return Provider(
        id=str(row["id"]),
        nome=row["nome"],
        categoria=row["categoria"],
        registro_profissional=row["registro_profissional"],
        descricao=row["descricao_atendimento"],
        tags=list(row["tags_atendimento"] or []),
        modalidade=row["modalidade_atendimento"],
        localizacao=row["localizacao_atendimento"],
        faixa_preco=row["faixa_preco"],
        avaliacao=float(row["avaliacao"]) if row["avaliacao"] is not None else None,
        qtd_avaliacoes=row["qtd_avaliacoes"],
        telefone=row["telefone"],
    )


def profile_from_row(row: dict, plans: dict[int, dict]) -> UserProfile:
    plano = plans.get(row["plano_safepass_id"]) or plans[1]
    return UserProfile(
        id=str(row["id"]),
        nome=row["nome"],
        plano=plan_slug(plano["nome"]),
        plano_nome=plano["nome"],
        uf=uf_from_address(row["endereco"]),
        possui_plano_saude=row["possui_plano_saude"],
        plano_saude=row["plano_saude"],
    )


class MemoryRepository:
    """Dados fictícios em memória (formato das tabelas reais) — usado sem DATABASE_URL e nos testes."""

    def __init__(self) -> None:
        self.plans = {p["id"]: p for p in data.PLANOS}
        self.users = {u["id"]: u for u in data.USUARIOS}
        self.providers = [provider_from_row(p) for p in data.PRESTADORES]
        self.leads: dict[str, dict] = {}
        self.conversations: dict[str, dict] = {}
        self.messages: dict[str, list[MessageRow]] = {}
        self.recados: list[dict] = []
        self.consents: dict[str, datetime] = {}
        self.consent_events: list[dict] = []

    def _names(self) -> dict[str, str]:
        names = {str(u["id"]): u["nome"] for u in data.USUARIOS}
        names |= {f"dep_{d['id']}": d["nome"] for d in data.DEPENDENTES}
        names |= {f"pet_{p['id']}": p["nome"] for p in data.PETS}
        return names

    async def list_plans(self) -> list[Plan]:
        return [plan_from_row(p) for p in data.PLANOS]

    async def get_user(self, user_id: str) -> UserProfile | None:
        row = self.users.get(parse_user_id(user_id) or -1)
        return profile_from_row(row, self.plans) if row else None

    async def list_dependents(self, user_id: str) -> list[Dependent]:
        uid = parse_user_id(user_id)
        people = [
            Dependent(id=f"dep_{d['id']}", nome=d["nome"], tipo="pessoa", data_nascimento=d["data_nascimento"])
            for d in data.DEPENDENTES if d["usuario_id"] == uid
        ]
        pets = [
            Dependent(id=f"pet_{p['id']}", nome=p["nome"], tipo="pet", data_nascimento=p["data_nascimento"],
                      especie=p["especie"], raca=p["raca"])
            for p in data.PETS if p["usuario_id"] == uid
        ]
        return people + pets

    async def list_documents(self, user_id: str, titular_id: str | None) -> list[RawDocument]:
        uid = parse_user_id(user_id)
        names = self._names()
        docs = []
        for d in data.DOCUMENTOS:
            key = titular_key(d["titular_tipo"], d["titular_id"])
            if d["usuario_id"] != uid or (titular_id and key != titular_id):
                continue
            docs.append(RawDocument(
                id=str(d["id"]), titular_id=key, titular_nome=names[key], tipo=d["tipo"],
                validade=date.fromisoformat(d["validade"]) if d["validade"] else None, observacao=d["observacao"],
            ))
        return docs

    async def list_providers(self, filters: ProviderFilters) -> list[Provider]:
        return filter_providers(self.providers, filters)

    async def create_lead(self, user_id: str, nome: str, telefone: str, mensagem: str) -> tuple[str, str]:
        lead_id, conversation_id = str(uuid.uuid4()), str(uuid.uuid4())
        self.leads[lead_id] = {"usuario_id": user_id, "nome": nome, "telefone": telefone, "mensagem_inicial": mensagem}
        self.conversations[conversation_id] = {"lead_id": lead_id, "usuario_id": user_id}
        return lead_id, conversation_id

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        conversa = self.conversations.get(conversation_id)
        if not conversa:
            return None
        return Conversation(usuario_id=conversa["usuario_id"], lead_nome=self.leads[conversa["lead_id"]]["nome"])

    async def save_messages(self, conversation_id: str, rows: list[MessageRow]) -> None:
        self.messages.setdefault(conversation_id, []).extend(rows)

    async def create_recado(self, conversation_id: str, mensagem: str) -> None:
        lead_id = self.conversations.get(conversation_id, {}).get("lead_id")
        self.recados.append({"lead_id": lead_id, "mensagem": mensagem})

    async def list_messages(self, conversation_id: str, limit: int) -> list[MessageRow]:
        return self.messages.get(conversation_id, [])[-limit:]

    async def get_consent(self, user_id: str) -> datetime | None:
        return self.consents.get(user_id)

    async def set_consent(self, user_id: str, granted_at: datetime | None, origem: str) -> None:
        if granted_at is None:
            self.consents.pop(user_id, None)
        else:
            self.consents[user_id] = granted_at
        self.consent_events.append({"usuario_id": user_id, "acao": "concedido" if granted_at else "revogado",
                                    "origem": origem})

    async def search_knowledge(self, embedding: list[float], k: int) -> list[str] | None:
        return None

    async def close(self) -> None:
        return None
