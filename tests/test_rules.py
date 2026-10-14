"""Regras de negócio da PO (regras/regras-negocio.json): validação, valores derivados e efeito no comportamento."""

import copy
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest

from app.assistant.fallback import within_business_hours
from app.assistant.loop import Assistant
from app.assistant.prompt import knowledge_chunks
from app.contracts import Provider, ProviderFilters
from app.domain.documents import document_status
from app.main import create_app
from app.repos.memory import MemoryRepository
from app.rules import DEFAULT_PATH, BusinessRules
from app.services.search import filter_providers
from scripts.regras import SCHEMA_PATH, schema_text
from tests.conftest import RULES, make_settings

TZ = ZoneInfo("America/Sao_Paulo")
RAW: dict[str, Any] = json.loads(DEFAULT_PATH.read_text(encoding="utf-8"))


def rules_with(path: str, value: Any) -> BusinessRules:
    """Cópia das regras do arquivo com um campo trocado ("atendimento_humano.abre")."""
    raw = copy.deepcopy(RAW)
    *parents, last = path.split(".")
    node = raw
    for key in parents:
        node = node[int(key)] if isinstance(node, list) else node[key]
    if isinstance(node, list):
        node[int(last)] = value
    else:
        node[last] = value
    return BusinessRules.model_validate(raw)


def test_shipped_file_keeps_previous_behavior():
    assert RULES.horario_atendimento() == "segunda a sexta, das 8h às 18h"
    assert RULES.render(RULES.atendimento_humano.mensagem_fora_do_horario) == (
        "Nosso atendimento humano funciona de segunda a sexta, das 8h às 18h. "
        "Deixe seu recado que retornamos no próximo horário útil."
    )
    textos = [RULES.render(t.texto) for t in RULES.base_conhecimento]
    assert "Documentos enviados passam por OCR e geram alertas 30 dias antes do vencimento." in textos
    assert RULES.documentos.dias_alerta_vencimento == 30 and RULES.consentimento.validade_dias == 365


@pytest.mark.parametrize(
    "dias,abre,fecha,expected",
    [
        (
            ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
            "08:00",
            "18:00",
            "segunda a sábado, das 8h às 18h",
        ),
        (["sexta", "segunda", "quarta"], "09:30", "17:00", "segunda, quarta e sexta, das 9h30 às 17h"),
        (["sabado"], "08:00", "12:00", "sábado, das 8h às 12h"),
    ],
)
def test_business_hours_text(dias, abre, fecha, expected):
    raw = copy.deepcopy(RAW)
    raw["atendimento_humano"] |= {"dias": dias, "abre": abre, "fecha": fecha}
    assert BusinessRules.model_validate(raw).horario_atendimento() == expected


@pytest.mark.parametrize(
    "path,value,message",
    [
        ("atendimento_humano.abre", "19:00", "'abre' precisa ser antes de 'fecha'"),
        ("atendimento_humano.abre", "8h", "Input should be in a valid time format"),
        ("atendimento_humano.dias", ["segunda", "segunda"], "dia repetido"),
        ("atendimento_humano.dias", ["seg"], "Input should be 'segunda'"),
        ("atendimento_humano.whatsapp", "(61) 99999-9999", "should match pattern"),
        ("documentos.dias_alerta_vencimento", 0, "greater than or equal to 1"),
        ("consentimento.mensagem_pedido", "", "at least 1 character"),
        ("base_conhecimento.0.texto", "Plano a partir de {preco}.", "marcador desconhecido {preco}"),
        ("base_conhecimento.0.texto", "Nosso {nome} é um clube.", "marcador desconhecido {nome}"),
        ("base_conhecimento.0.texto", "Chave { solta", "sem par"),
        ("base_conhecimento.0.categoria", "outra", "Input should be 'institutional'"),
        ("busca_prestadores.cidades", {"Brasília": "BR"}, "UF inválida: BR"),
        ("documentos", {"dias_alerta_vencimento": 30, "dias_alerta": 30}, "Extra inputs are not permitted"),
    ],
)
def test_invalid_rules_are_rejected_with_the_field(path, value, message):
    with pytest.raises(ValueError, match=message.replace("{", r"\{").replace("(", r"\(")):
        rules_with(path, value)


def test_invalid_file_stops_the_app(tmp_path: Path):
    broken = tmp_path / "regras.json"
    broken.write_text('{"atendimento_humano": ', encoding="utf-8")
    with pytest.raises(ValueError, match="JSON inválido na linha 1"):
        create_app(make_settings(regras_path=broken))


def test_whatsapp_message_accepts_conversation_placeholders():
    rules = rules_with("atendimento_humano.mensagem_whatsapp", "{nome} ({id_usuario}): {motivo}. {horario_atendimento}")
    texto = rules.render(rules.atendimento_humano.mensagem_whatsapp, nome="Ana", id_usuario="1", motivo="estorno")
    assert texto == "Ana (1): estorno. segunda a sexta, das 8h às 18h"


def test_changing_the_rules_changes_behavior():
    # Alerta de vencimento: 60 dias à frente é "valido" com 30, "vencendo" com 90.
    today = date(2026, 8, 20)
    validade = date(2026, 10, 19)
    assert document_status(validade, today, RULES.documentos.dias_alerta_vencimento) == "valido"
    assert (
        document_status(
            validade, today, rules_with("documentos.dias_alerta_vencimento", 90).documentos.dias_alerta_vencimento
        )
        == "vencendo"
    )

    # Atendimento no sábado.
    saturday_10h = datetime(2026, 9, 26, 10, tzinfo=TZ)
    assert not within_business_hours(saturday_10h, RULES)
    sabado = rules_with("atendimento_humano.dias", ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"])
    assert within_business_hours(saturday_10h, sabado)

    # Sinônimo novo da PO.
    vet = Provider(
        id="1", nome="Vet", categoria="Veterinário", registro_profissional=None, descricao=None,
        tags=["Cães e Gatos"], modalidade="presencial", localizacao="SP", faixa_preco=None,
        avaliacao=4.5, qtd_avaliacoes=1, telefone=None,
    )  # fmt: skip
    filters = ProviderFilters(especialidade="doguinho")
    assert not filter_providers([vet], filters, RULES.busca_prestadores)
    doguinho = rules_with("busca_prestadores.sinonimos", {**RAW["busca_prestadores"]["sinonimos"], "Doguinho": "cães"})
    assert filter_providers([vet], filters, doguinho.busca_prestadores)


class _FakeEmbeddings:
    async def embed(self, text: str) -> list[float]:
        return [0.0]


async def _knowledge_context(monkeypatch, rules: BusinessRules, indexed_rules: BusinessRules) -> object:
    """Contexto que o modelo recebe quando o índice vetorial foi gerado com `indexed_rules`."""
    repo = MemoryRepository()
    plans = await repo.list_plans()
    indexed = {text for _, text in knowledge_chunks(plans, indexed_rules)}

    async def indexed_knowledge() -> set[str]:
        return indexed

    async def search_knowledge(embedding: list[float], k: int) -> list[str]:
        return ["TRECHO DO RAG"]

    monkeypatch.setattr(repo, "indexed_knowledge", indexed_knowledge)
    monkeypatch.setattr(repo, "search_knowledge", search_knowledge)
    assistant = Assistant(
        repo=repo, llm=_FakeEmbeddings(), settings=make_settings(), rules=rules, user_id="1", lead_nome="Ana"
    )  # type: ignore[arg-type]
    content, _ = await assistant.run_tool("consultar_base_conhecimento", {"pergunta": "formas de pagamento"})
    assert isinstance(content, dict)
    return content["contexto"]


async def test_rag_is_used_when_index_matches_the_rules(monkeypatch):
    assert await _knowledge_context(monkeypatch, RULES, RULES) == ["TRECHO DO RAG"]


@pytest.mark.parametrize(
    "rules",
    [
        rules_with("base_conhecimento.2.texto", "Pagamento por cartão de crédito ou Pix."),  # texto alterado
        BusinessRules.model_validate(  # regra nova
            RAW | {"base_conhecimento": [*RAW["base_conhecimento"], {"categoria": "support", "texto": "Regra nova."}]}
        ),
    ],
    ids=["texto-alterado", "regra-nova"],
)
async def test_stale_rag_index_falls_back_to_current_rules(monkeypatch, rules):
    """Se a PO mudou a base e o índice ainda é o antigo, o modelo recebe a base atual inteira."""
    context = await _knowledge_context(monkeypatch, rules, RULES)
    assert isinstance(context, str) and context != "TRECHO DO RAG"
    assert all(rules.render(t.texto) in context for t in rules.base_conhecimento)


def test_schema_file_matches_the_rules_model():
    """O schema que o editor usa para validar o JSON precisa estar em dia: `python -m scripts.regras schema`."""
    assert SCHEMA_PATH.read_text(encoding="utf-8") == schema_text()
