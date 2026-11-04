"""Regras de negócio editáveis pela PO: carregadas de regras/regras-negocio.json na subida do app.

O arquivo é validado aqui; um erro impede o app de subir (o deploy falha em vez de rodar com regra quebrada).
Textos aceitam marcadores como {horario_atendimento}, trocados pelos valores das próprias regras.
"""

import json
import string
from datetime import time
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, WithJsonSchema, field_validator, model_validator

from app.services.text import normalize

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "regras" / "regras-negocio.json"

DiaSemana = Literal["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]
DIAS: tuple[DiaSemana, ...] = ("segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo")
_DIAS_TEXTO = {
    "segunda": "segunda",
    "terca": "terça",
    "quarta": "quarta",
    "quinta": "quinta",
    "sexta": "sexta",
    "sabado": "sábado",
    "domingo": "domingo",
}
UFS = frozenset(
    [
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
    ]
)

# "08:00" no arquivo; o schema descreve esse formato (o "time" padrão do JSON Schema exige segundos e fuso).
Hora = Annotated[time, WithJsonSchema({"type": "string", "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$"})]
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]

# Marcadores que qualquer texto pode usar; a mensagem do WhatsApp tem também os da conversa.
_GLOBAL_KEYS = frozenset({"horario_atendimento", "dias_alerta_vencimento", "validade_consentimento_dias"})
_WHATSAPP_KEYS = frozenset({"nome", "id_usuario", "motivo"})


class _Strict(BaseModel):
    # Campo desconhecido = erro: um nome digitado errado não pode ser ignorado em silêncio.
    model_config = ConfigDict(extra="forbid", frozen=True)


class AtendimentoHumano(_Strict):
    whatsapp: Annotated[str, StringConstraints(pattern=r"^[0-9]{10,15}$")] = Field(
        description="Número com DDI e DDD, só dígitos. Ex.: 5561999999999"
    )
    dias: list[DiaSemana] = Field(min_length=1, description="Dias com atendimento humano")
    abre: Hora = Field(description="Horário de abertura (HH:MM), no fuso da aplicação")
    fecha: Hora = Field(description="Horário de fechamento (HH:MM), no fuso da aplicação")
    mensagem_whatsapp: Texto = Field(
        description="Texto que já vai preenchido no WhatsApp. Marcadores: {nome}, {id_usuario}, {motivo}"
    )
    mensagem_fora_do_horario: Texto = Field(description="Mostrada no lugar do link quando o atendimento está fechado")

    @field_validator("dias")
    @classmethod
    def _dias_unicos(cls, dias: list[DiaSemana]) -> list[DiaSemana]:
        if len(set(dias)) != len(dias):
            raise ValueError("dia repetido")
        return sorted(dias, key=DIAS.index)

    @model_validator(mode="after")
    def _abre_antes(self) -> "AtendimentoHumano":
        if self.abre >= self.fecha:
            raise ValueError("'abre' precisa ser antes de 'fecha'")
        return self


class Documentos(_Strict):
    dias_alerta_vencimento: int = Field(
        ge=1, le=365, description="Documento com validade dentro deste prazo aparece como 'vencendo'"
    )


class Consentimento(_Strict):
    validade_dias: int = Field(ge=1, le=3650, description="Por quantos dias a autorização LGPD vale")
    mensagem_pedido: Texto = Field(description="Texto do card que pede a autorização")
    mensagem_revogacao: Texto = Field(description="Resposta quando o usuário revoga a autorização")


class Assistente(_Strict):
    mensagem_sem_resposta: Texto = Field(description="Resposta quando a IA não consegue responder")


class TrechoBase(_Strict):
    categoria: Literal["institutional", "plan_rules", "benefits", "support"]
    texto: Texto


class BuscaPrestadores(_Strict):
    sinonimos: dict[str, str] = Field(
        description="Termo informal → termo que aparece nas tags ou categorias. Ex.: cachorro → caes"
    )
    cidades: dict[str, str] = Field(description="Cidade → UF, para achar prestadores cadastrados só com a UF")

    @field_validator("sinonimos")
    @classmethod
    def _normaliza_sinonimos(cls, value: dict[str, str]) -> dict[str, str]:
        out = {normalize(k): normalize(v) for k, v in value.items()}
        if any(not k or not v for k, v in out.items()):
            raise ValueError("sinônimo vazio")
        return out

    @field_validator("cidades")
    @classmethod
    def _valida_cidades(cls, value: dict[str, str]) -> dict[str, str]:
        out = {normalize(k): v.strip().upper() for k, v in value.items()}
        invalid = sorted({uf for uf in out.values() if uf not in UFS})
        if invalid:
            raise ValueError(f"UF inválida: {', '.join(invalid)}")
        return out


class BusinessRules(_Strict):
    model_config = ConfigDict(extra="forbid", frozen=True, populate_by_name=True)

    schema_ref: str | None = Field(default=None, alias="$schema")
    atendimento_humano: AtendimentoHumano
    documentos: Documentos
    consentimento: Consentimento
    assistente: Assistente
    base_conhecimento: list[TrechoBase] = Field(min_length=1)
    busca_prestadores: BuscaPrestadores

    @model_validator(mode="after")
    def _marcadores_conhecidos(self) -> "BusinessRules":
        textos: list[tuple[str, str, frozenset[str]]] = [
            (
                "atendimento_humano.mensagem_whatsapp",
                self.atendimento_humano.mensagem_whatsapp,
                _WHATSAPP_KEYS | _GLOBAL_KEYS,
            ),
            (
                "atendimento_humano.mensagem_fora_do_horario",
                self.atendimento_humano.mensagem_fora_do_horario,
                _GLOBAL_KEYS,
            ),
            ("consentimento.mensagem_pedido", self.consentimento.mensagem_pedido, _GLOBAL_KEYS),
            ("consentimento.mensagem_revogacao", self.consentimento.mensagem_revogacao, _GLOBAL_KEYS),
            ("assistente.mensagem_sem_resposta", self.assistente.mensagem_sem_resposta, _GLOBAL_KEYS),
            *((f"base_conhecimento[{i}]", t.texto, _GLOBAL_KEYS) for i, t in enumerate(self.base_conhecimento)),
        ]
        for campo, texto, allowed in textos:
            try:
                used = {name for _, name, _, _ in string.Formatter().parse(texto) if name is not None}
            except ValueError as exc:
                raise ValueError(f"{campo}: chave {{ ou }} sem par") from exc
            unknown = sorted(used - allowed)
            if unknown:
                raise ValueError(f"{campo}: marcador desconhecido {{{unknown[0]}}}")
        return self

    # ---- Valores derivados ----

    def horario_atendimento(self) -> str:
        """ "segunda a sexta, das 8h às 18h" (dias seguidos viram intervalo)."""
        dias = self.atendimento_humano.dias
        idx = [DIAS.index(d) for d in dias]
        if len(dias) > 2 and idx == list(range(idx[0], idx[-1] + 1)):
            quando = f"{_DIAS_TEXTO[dias[0]]} a {_DIAS_TEXTO[dias[-1]]}"
        elif len(dias) == 1:
            quando = _DIAS_TEXTO[dias[0]]
        else:
            quando = ", ".join(_DIAS_TEXTO[d] for d in dias[:-1]) + f" e {_DIAS_TEXTO[dias[-1]]}"
        return f"{quando}, das {_hora(self.atendimento_humano.abre)} às {_hora(self.atendimento_humano.fecha)}"

    def render(self, texto: str, **extra: str) -> str:
        """Troca os marcadores do texto pelos valores das regras (e pelos `extra`, na mensagem do WhatsApp)."""
        values = {
            "horario_atendimento": self.horario_atendimento(),
            "dias_alerta_vencimento": str(self.documentos.dias_alerta_vencimento),
            "validade_consentimento_dias": str(self.consentimento.validade_dias),
            **extra,
        }
        return texto.format_map(values)


def _hora(t: time) -> str:
    return f"{t.hour}h" if t.minute == 0 else f"{t.hour}h{t.minute:02d}"


def load_rules(path: Path = DEFAULT_PATH) -> BusinessRules:
    """Lê e valida o arquivo. Erro de JSON ou de regra → ValueError com o campo e o motivo."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{path.name}: JSON inválido na linha {exc.lineno}, coluna {exc.colno}: {exc.msg}") from exc
    return BusinessRules.model_validate(raw)
