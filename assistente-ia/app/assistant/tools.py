"""As 6 ferramentas do assistente (formato OpenAI). Fonte única: nome, schema, intenção e consentimento."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from app.contracts import Intent


class ToolName(StrEnum):
    BASE_CONHECIMENTO = "consultar_base_conhecimento"
    MINHA_CONTA = "consultar_minha_conta"
    DEPENDENTES = "consultar_dependentes"
    DOCUMENTOS = "consultar_documentos"
    PRESTADORES = "buscar_prestadores"
    WHATSAPP = "encaminhar_whatsapp"


@dataclass(frozen=True)
class ToolSpec:
    name: ToolName
    description: str
    intent: Intent
    # Lê dados pessoais: só roda com consentimento LGPD ativo.
    requires_consent: bool = False
    properties: dict[str, Any] = field(default_factory=dict)
    required: tuple[str, ...] = ()

    def schema(self) -> dict[str, Any]:
        parameters: dict[str, Any] = {"type": "object", "properties": self.properties}
        if self.required:
            parameters["required"] = list(self.required)
        return {
            "type": "function",
            "function": {"name": str(self.name), "description": self.description, "parameters": parameters},
        }


SPECS: dict[ToolName, ToolSpec] = {
    spec.name: spec
    for spec in (
        ToolSpec(
            ToolName.BASE_CONHECIMENTO,
            "Responde dúvidas sobre planos, benefícios, regras, preços e funcionamento do SAFEpass.",
            intent="duvida_plataforma",
            properties={"pergunta": {"type": "string"}},
            required=("pergunta",),
        ),
        ToolSpec(
            ToolName.MINHA_CONTA,
            "Retorna dados da conta do usuário logado: nome, plano, status, pontos.",
            intent="consulta_conta",
            requires_consent=True,
        ),
        ToolSpec(
            ToolName.DEPENDENTES,
            "Lista os dependentes (pessoas) e os pets do usuário logado.",
            intent="consulta_dependentes",
            requires_consent=True,
        ),
        ToolSpec(
            ToolName.DOCUMENTOS,
            "Lista documentos do usuário logado, de um dependente ou de um pet dele, com validade e status.",
            intent="consulta_documentos",
            requires_consent=True,
            properties={
                "nome_dependente": {"type": "string", "description": "Opcional. Nome do dependente ou do pet."}
            },
        ),
        ToolSpec(
            ToolName.PRESTADORES,
            "Busca prestadores no marketplace (saúde humana e veterinária) a partir do pedido do usuário.",
            intent="busca_prestadores",
            properties={
                "categoria": {
                    "type": "string",
                    "description": (
                        "Tipo de profissional: Médico, Veterinário, Psicólogo, Psiquiatra, Nutricionista, "
                        "Fisioterapeuta, Dentista, Fonoaudiólogo, Terapeuta Ocupacional, Enfermeiro, "
                        "Acupunturista, Psicanalista, Quiropraxista, Psicopedagogo, Terapeuta Holístico."
                    ),
                },
                "especialidade": {
                    "type": "string",
                    "description": (
                        "Especialidade ou tema: Dermatologia, Cardiologia, Pediatria, Ansiedade, Cães, Gatos, etc."
                    ),
                },
                "cidade": {"type": "string", "description": "Cidade ou UF (ex.: Brasília, DF, São Paulo)."},
                "modalidade": {"type": "string", "enum": ["presencial", "online"]},
            },
        ),
        ToolSpec(
            ToolName.WHATSAPP,
            "Usar quando não souber responder, a pergunta estiver fora do escopo, "
            "o usuário pedir atendente humano ou houver reclamação/urgência.",
            intent="fallback_whatsapp",
            properties={"motivo": {"type": "string"}},
            required=("motivo",),
        ),
    )
}

TOOLS: list[dict[str, Any]] = [spec.schema() for spec in SPECS.values()]


def tool_error(code: str, detalhe: str) -> dict[str, str]:
    """Resultado de ferramenta com erro: `erro` é um código estável; `detalhe` orienta o modelo."""
    return {"erro": code, "detalhe": detalhe}
