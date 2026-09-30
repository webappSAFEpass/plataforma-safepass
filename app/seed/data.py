"""Dados fictícios para o modo memória e os testes, no MESMO formato das tabelas do Supabase.

Os planos são cópia fiel da tabela `planos`; pessoas e prestadores são inventados.
"""

PLANOS = [
    {"id": 1, "nome": "SAFEpass Free", "qtd_dependentes": 1, "qtd_avaliacoes_mes": 2,
     "acesso_cupom": "Limitado plano free", "acumulo_ponto": "1x por avaliação", "historico_saude": False,
     "cartao_fisico_beneficios": False, "checkup_gratuito": False, "valor": 0.0, "desconto": "0"},
    {"id": 2, "nome": "SAFEpass Aura", "qtd_dependentes": 4, "qtd_avaliacoes_mes": 15,
     "acesso_cupom": "Limitado plano free + Aura", "acumulo_ponto": "2x por avaliação + mensalidade vira pontos",
     "historico_saude": True, "cartao_fisico_beneficios": False, "checkup_gratuito": False, "valor": 49.9,
     "desconto": "1 mes gratis"},
    {"id": 3, "nome": "SAFEpass Aura+", "qtd_dependentes": 6, "qtd_avaliacoes_mes": None,
     "acesso_cupom": "Ilimitado (plano free + Aura + Aura+)", "acumulo_ponto": "3x por avaliação + mensalidade vira pontos",
     "historico_saude": True, "cartao_fisico_beneficios": True, "checkup_gratuito": True, "valor": 97.0,
     "desconto": "3 meses gratis"},
]

USUARIOS = [
    {"id": 1, "nome": "Ana Beatriz Souza", "data_nascimento": "1988-04-12", "endereco": "SQS 308, Asa Sul - DF",
     "possui_plano_saude": False, "plano_saude": None, "plano_safepass_id": 3},
    # Existe só para provar que o token do usuário 1 não enxerga outro usuário.
    {"id": 2, "nome": "Carlos Mendes", "data_nascimento": "1979-09-30", "endereco": "Rua 7, Setor Bueno - GO",
     "possui_plano_saude": True, "plano_saude": "Amil", "plano_safepass_id": 1},
]

DEPENDENTES = [
    {"id": 1, "usuario_id": 1, "nome": "Lucas Souza", "data_nascimento": "2018-05-14"},
    {"id": 2, "usuario_id": 1, "nome": "Maria Souza", "data_nascimento": "1959-11-02"},
    {"id": 3, "usuario_id": 2, "nome": "Júlia Mendes", "data_nascimento": "2015-02-20"},
]

PETS = [
    {"id": 1, "usuario_id": 1, "nome": "Thor", "data_nascimento": "2021-03-01", "especie": "Cachorro", "raca": "Labrador"},
    {"id": 2, "usuario_id": 2, "nome": "Mia", "data_nascimento": "2020-07-15", "especie": "Gato", "raca": "SRD"},
]

# titular_tipo + titular_id apontam para usuario, dependente ou pet.
DOCUMENTOS = [
    {"id": 1, "usuario_id": 1, "titular_tipo": "usuario", "titular_id": 1, "tipo": "CNH", "validade": "2026-10-05", "observacao": None},
    {"id": 2, "usuario_id": 1, "titular_tipo": "usuario", "titular_id": 1, "tipo": "Carteirinha SAFEpass", "validade": "2027-03-10", "observacao": None},
    {"id": 3, "usuario_id": 1, "titular_tipo": "dependente", "titular_id": 1, "tipo": "RG", "validade": "2031-05-14", "observacao": None},
    {"id": 4, "usuario_id": 1, "titular_tipo": "dependente", "titular_id": 1, "tipo": "Carteira de vacinação", "validade": None, "observacao": "Próxima dose em 2026-09-30"},
    {"id": 5, "usuario_id": 1, "titular_tipo": "dependente", "titular_id": 2, "tipo": "Receita de uso contínuo", "validade": "2026-09-01", "observacao": None},
    {"id": 6, "usuario_id": 1, "titular_tipo": "pet", "titular_id": 1, "tipo": "Carteira de vacinação do pet", "validade": "2026-12-01", "observacao": None},
    {"id": 7, "usuario_id": 2, "titular_tipo": "usuario", "titular_id": 2, "tipo": "RG", "validade": "2030-01-01", "observacao": None},
]


def _p(id_, nome, categoria, tags, modalidade, localizacao, avaliacao, qtd, preco="R$ 200", registro=None, descricao=None):
    return {"id": id_, "nome": nome, "categoria": categoria, "registro_profissional": registro,
            "telefone": f"(61) 3200-{id_:04d}", "descricao_atendimento": descricao or f"Atendimento em {', '.join(tags)}.",
            "tags_atendimento": tags, "modalidade_atendimento": modalidade, "localizacao_atendimento": localizacao,
            "faixa_preco": preco, "avaliacao": avaliacao, "qtd_avaliacoes": qtd}


PRESTADORES = [
    _p(1, "CardioVida", "Médico", ["Cardiologia", "Check-up"], "Presencial", "Brasília, DF", 4.8, 120, registro="CRM-DF 1001"),
    _p(2, "Dr. Rafael Lima", "Médico", ["Cardiologia", "Arritmia"], "Híbrido", "Goiânia, GO", 4.6, 80),
    _p(3, "Dra. Camila Rocha", "Médico", ["Dermatologia", "Acne"], "Presencial", "Brasília, DF", 4.7, 64),
    _p(4, "Pediatria Sorriso", "Médico", ["Pediatria", "Vacinação"], "Presencial", "Brasília, DF", 4.9, 150),
    _p(5, "Dra. Ana Luiza Costa", "Psicólogo", ["Ansiedade", "TDAH", "Depressão"], "Online", "Atendimento 100% Online", 4.9, 124),
    _p(6, "Clínica Pet Derma", "Veterinário", ["Dermatologia", "Cães e Gatos", "Alergias"], "Presencial", "Brasília, DF", 4.8, 45),
    _p(7, "VetCare 24h", "Veterinário", ["Emergência", "Cães", "Cirurgia"], "Presencial", "SP", 4.5, 300),
    _p(8, "Nutri Leve", "Nutricionista", ["Emagrecimento", "Alimentação"], "Online", "Atendimento 100% Online", 4.4, 30),
    _p(9, "Dr. Paulo Nogueira", "Fisioterapeuta", ["Ortopedia", "Coluna"], "Presencial", "Brasília, DF", 4.5, 70),
    _p(10, "OdontoFamília", "Dentista", ["Clareamento", "Canal", "Odontopediatria"], "Presencial", "São Paulo, SP", 4.8, 210),
]
