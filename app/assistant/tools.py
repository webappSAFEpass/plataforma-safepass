"""As 6 ferramentas do assistente (formato OpenAI) — mesmas de safepass-buddy/src/lib/safepass/tools.server.ts."""

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "consultar_base_conhecimento",
            "description": "Responde dúvidas sobre planos, benefícios, regras, preços e funcionamento do SAFEpass.",
            "parameters": {
                "type": "object",
                "properties": {"pergunta": {"type": "string"}},
                "required": ["pergunta"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_minha_conta",
            "description": "Retorna dados da conta do usuário logado: nome, plano, status, pontos.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_dependentes",
            "description": "Lista os dependentes (pessoas) e os pets do usuário logado.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_documentos",
            "description": "Lista documentos do usuário logado, de um dependente ou de um pet dele, com validade e status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "nome_dependente": {"type": "string", "description": "Opcional. Nome do dependente ou do pet."}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_prestadores",
            "description": "Busca prestadores no marketplace (saúde humana e veterinária) a partir do pedido do usuário.",
            "parameters": {
                "type": "object",
                "properties": {
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
                        "description": "Especialidade ou tema: Dermatologia, Cardiologia, Pediatria, Ansiedade, Cães, Gatos, etc.",
                    },
                    "cidade": {"type": "string", "description": "Cidade ou UF (ex.: Brasília, DF, São Paulo)."},
                    "modalidade": {"type": "string", "enum": ["presencial", "online"]},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "encaminhar_whatsapp",
            "description": (
                "Usar quando não souber responder, a pergunta estiver fora do escopo, "
                "o usuário pedir atendente humano ou houver reclamação/urgência."
            ),
            "parameters": {
                "type": "object",
                "properties": {"motivo": {"type": "string"}},
                "required": ["motivo"],
            },
        },
    },
]

INTENT_BY_TOOL: dict[str, str] = {
    "consultar_base_conhecimento": "duvida_plataforma",
    "consultar_minha_conta": "consulta_conta",
    "consultar_dependentes": "consulta_dependentes",
    "consultar_documentos": "consulta_documentos",
    "buscar_prestadores": "busca_prestadores",
    "encaminhar_whatsapp": "fallback_whatsapp",
}

# Ferramentas que leem dados pessoais — exigem consentimento LGPD ativo.
PRIVATE_TOOLS = {"consultar_minha_conta", "consultar_dependentes", "consultar_documentos"}
