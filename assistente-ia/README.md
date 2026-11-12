# SAFEpass Backend — Assistente de IA (Squad 48 · Desafio 05)

FastAPI com duas responsabilidades:

1. **API de dados** consumida pelo assistente (conta, dependentes, documentos, prestadores), com os contratos exatos do briefing.
2. **Orquestração do assistente**: system prompt, as 6 ferramentas (tool calling no formato OpenAI), consentimento LGPD, guardrails, fallback para WhatsApp, RAG com pgvector e streaming SSE.

```
Browser ─> Next.js (app/api/* — guarda o token) ─> FastAPI ─┬─> Postgres/Supabase (ou memória)
                                                             └─> LLM compatível com OpenAI
```

## Regras de negócio

Horário do atendimento humano, número do WhatsApp, prazo de alerta de documentos, validade do consentimento, mensagens fixas, base de conhecimento e vocabulário da busca ficam em [`regras/regras-negocio.json`](regras/README.md). A PO edita esse arquivo por PR, o CI valida, e o backend não sobe com regra inválida. O guia de edição está em `regras/README.md`.

## Dados

A fonte da verdade são as tabelas do squad no Supabase: `usuario`, `dependente`, `pet`, `planos` e `prestador`. O backend **só lê** essas tabelas, com uma exceção: `usuario.permissao_assistente`, que ele mantém em sincronia com o consentimento. As tabelas próprias do assistente são criadas por `migrations/001_init.sql`:

| Tabela | Uso |
|---|---|
| `documento` | Documentos por usuário, dependente ou pet. Os fictícios têm `seed = true`, e só esses são recriados pelo script. |
| `lead`, `conversa`, `mensagem`, `recado` | Atendimento: mensagem guarda intent e tool_calls |
| `consentimento` | Estado atual do consentimento LGPD, válido por 12 meses |
| `consentimento_evento` | Trilha append-only de cada concessão ou revogação, com a origem (botão, mensagem ou api). É a prova exigida pelo art. 8º da LGPD. |
| `knowledge_chunk` | RAG com pgvector |

A migração também **liga o RLS em todas as tabelas**, inclusive nas do squad. Assim a chave pública do Supabase não lê CPF, e-mail nem endereço. O backend conecta como `postgres` e não é afetado. CPF, e-mail e endereço completo nunca saem do backend.

Os IDs públicos seguem este formato:

| Quem | Formato | Exemplo |
|---|---|---|
| Usuário | número | `"89"` |
| Dependente | `dep_{id}` | `"dep_3"` |
| Pet | `pet_{id}` | `"pet_33"` |

## Rodando

```bash
make install                              # venv + dependências de dev
cp .env.example .env                      # SERVICE_TOKENS, DATABASE_URL, LLM_API_KEY
.venv/bin/python -m scripts.db all --yes  # migrações + RLS + documentos fictícios (+ RAG); --yes porque recria dados
make run                                  # http://localhost:8000/v1  (health: /health, readiness: /ready)
```

| Comando | O que faz |
|---|---|
| `make check` | ruff (lint e formatação), mypy strict e os testes, incluindo os de Postgres |
| `make test` | testes com LLM falso e dados em memória |
| `make test-pg` | sobe um Postgres local descartável (`.pgtest/`) e roda também o contrato do repositório nele |
| `make test-live` | matriz de QA do PDF contra o LLM real (~4 min: a Groq gratuita tem limite de 8k tokens/min) |
| `make lock` | regenera o `requirements.txt` com hashes a partir do `requirements.in` |
| `make regras` | valida `regras/regras-negocio.json` (também roda no CI) |
| `make openapi` | regera o `openapi.json` (contrato para o front) |

O CI (`.github/workflows/ci.yml`) roda lint, mypy e todos os testes contra `pgvector/pgvector:pg17`, incluindo a busca vetorial. Ele também confere se o lockfile está atualizado.

Sem `DATABASE_URL`, o backend roda em memória com dados fictícios no mesmo formato das tabelas. Nesse modo o usuário é o `1`, Ana Beatriz.

Na demo com o Supabase, a sessão usa o usuário **89**: plano Aura+, DF, 2 dependentes e o pet Zeus.

### Estrutura

```
app/
  main.py            create_app(settings): rotas sob /v1, handlers de erro {error}, request id, /health, /ready
  config.py          Settings (uma instância por app, em app.state)
  rules.py           regras de negócio da PO: modelo, validação e marcadores de regras/regras-negocio.json
  deps.py            dependências tipadas (RepoDep, LLMDep, ScopeDep, SettingsDep) + known_user
  security.py        token de serviço com escopo de usuários
  observability.py   logs em texto ou JSON com request_id; nada de corpo, query ou PII
  contracts.py       modelos Pydantic (JSON em camelCase)
  routers/           data.py (dados) e chat.py (assistente)
  assistant/         tools.py (registro das 6 ferramentas), loop.py (rodadas), llm.py, prompt.py, fallback.py
  domain/            ids.py (usuário "89", "dep_3", "pet_7") e documents.py (validade)
  repos/             base.py (Protocol), memory.py, postgres.py, mapping.py (linha → modelo)
  services/          search.py (busca tolerante), text.py (normalização e higienização), ratelimit.py
migrations/          001 (tabelas do assistente + RLS) e 002 (auditoria LGPD, retenção, seed)
regras/              regras-negocio.json (editável pela PO), schema e guia de edição
scripts/             db.py (migrações, seed, RAG), regras.py (check/schema), openapi.py (contrato)
openapi.json         contrato da API para o front gerar os tipos (make openapi)
tests/               contrato do repositório (memória e Postgres), API, assistente, hardening, live
```

## Autenticação

Toda rota exige `Authorization: Bearer <token>`. Em `SERVICE_TOKENS`, cada token fica vinculado aos usuários que pode ler, por exemplo `token:89`.

| Situação | Resposta |
|---|---|
| Sem token ou com token inválido | 401 |
| Token válido, mas pedindo outro usuário | 404 (não revela se o usuário existe) |

O `userId` sai sempre da sessão do servidor do Next (`SESSION_USER_ID`), nunca do navegador.

## Endpoints

Todos ficam sob o prefixo `/v1`: `BACKEND_API_URL=http://localhost:8000/v1`. O `/docs` e o `/openapi.json` só aparecem com `EXPOSE_DOCS=true`. Criações respondem 201.

| Método | Path | Resposta |
|---|---|---|
| GET | `/plans` | `Plan[]`, da tabela `planos` (`free`, `aura`, `aura_plus`) |
| GET | `/account/{userId}` | `UserProfile` (nome, plano, UF, plano de saúde externo) |
| GET | `/dependents?userId=` | `Dependent[]`, pessoas (`dep_*`) e pets (`pet_*`) |
| GET | `/documents?userId=&dependentId=` | `DocumentItem[]`; status vencido / vencendo (≤ 30 dias) / válido |
| GET | `/providers?categoria=&especialidade=&cidade=&modalidade=&limit=` | `Provider[]` (detalhes abaixo) |
| POST | `/leads` `{userId, nome, telefone, mensagem}` | 201 `{leadId, conversationId}` |
| POST | `/chat` `{userId, conversationId, messages, simulateAfterHours?, retry?}` | `{reply, cards, debug{intent, toolCalls, latencyMs}}` |
| POST | `/chat/stream` (mesmo corpo) | SSE com eventos `token`, `reset`, `card`, `done` (ChatResponse) e `error` |
| POST | `/recados` `{userId, conversationId, mensagem}` | 201 `{ok: true}` |
| GET/POST | `/consent` `{userId, action: grant\|revoke}` | `{granted, grantedAt, expiresAt}` |

Como o `/chat` funciona:
- **O histórico vem do banco.** As últimas 20 mensagens, com teto de 16 mil caracteres. Do corpo, o backend usa só a última mensagem, que precisa ser do usuário. O cliente não consegue injetar falas do assistente. O `lead` do corpo é ignorado: o nome sai do lead gravado.
- **`retry: true`** reprocessa a última pergunta já gravada, sem gravar de novo. É usado depois de o usuário autorizar o consentimento.
- **Gravação:**
  - A pergunta é gravada antes de chamar a IA.
  - A resposta é gravada com `asyncio.shield`.
  - Se o cliente desconecta, a geração é cancelada e a pergunta fica registrada.
- **SSE:**
  - `reset` avisa que o texto recebido até ali foi descartado, seja de uma rodada com ferramentas ou de uma rodada repetida.
  - O texto final é sempre o `reply` do evento `done`, já sem markdown.
- **Limites:** 12 mensagens por minuto por conversa (429) e 90s por requisição (504).

Busca de prestadores (`/providers`):
- Não diferencia acento nem caixa.
- Entende radicais: "cardiologista" encontra "Cardiologia".
- Entende sinônimos: "cachorro" vira "Cães", "dermato" vira "Dermatologia".
- Cidade → UF: "São Paulo" também encontra os registros que têm só "SP".
- `online` e `presencial` incluem os prestadores híbridos.
- Resultados ordenados pela avaliação.

Erros sempre em `{"error": "mensagem"}`:

| Código | Quando |
|---|---|
| 401 | Sem token ou token inválido |
| 404 | Recurso inexistente ou de outro usuário |
| 422 | Parâmetro inválido |
| 502 | Falha no LLM |
| 503 | LLM não configurado |

## Assistente

- **Ferramentas** (`app/assistant/tools.py`): `consultar_base_conhecimento`, `consultar_minha_conta`, `consultar_dependentes`, `consultar_documentos`, `buscar_prestadores` e `encaminhar_whatsapp`. São no máximo 3 rodadas de ferramentas, e a última chamada ao LLM vai sem tools.
- **LGPD**:
  - As três ferramentas de dados pessoais exigem consentimento ativo. Sem ele, o assistente devolve um card `consent` e não lê nada.
  - O consentimento vale `consentimento.validade_dias` (365) a partir de `POST /consent`.
  - Uma mensagem com "revogar consentimento" revoga na hora, sem chamar o LLM.
- **Privacidade**: nomes de pessoas fora da família são recusados, e a busca por nome acontece só entre o titular e os dependentes dele.
- **Guardrails** (prompt): proíbe diagnóstico e prescrição e bloqueia remédio sem receita. Em emergência, orienta ligar para SAMU 192 ou Bombeiros 193. Resiste a prompt injection e a pedidos de cupom grátis. Pedidos financeiros vão para o atendimento humano.
- **WhatsApp**:
  - Dentro do horário (`atendimento_humano` nas regras; hoje seg–sex, 8h–18h, Brasília), gera um link `wa.me` com o resumo e o ID do usuário.
  - Fora do horário, mostra o formulário de recado. `simulateAfterHours` força esse caso.
- **Base de conhecimento**: os planos são gerados a partir da tabela `planos`, e as regras gerais (carência, pagamento, horário etc.) estão em `regras/regras-negocio.json`.
  - Se o índice vetorial não bate com a base atual (a PO mudou uma regra e ninguém rodou `ingest-kb`), o assistente usa a base inteira, nunca o texto antigo.
  - Com Postgres e `EMBEDDINGS_API_KEY`, entram os 3 trechos mais próximos por cosseno (`text-embedding-3-small`).
  - Sem isso, entra a base inteira, que é pequena.
- **Robustez**:
  - Em 429 (rate limit), o backend espera o tempo pedido pelo provedor, por até 30s, e tenta de novo.
  - Uma resposta vazia ou uma chamada de ferramenta malformada é repetida uma vez.
  - O markdown é removido da resposta final.
- **Logs**: registram só método, rota, status, intent e latência. Nunca registram o conteúdo das conversas, e o telefone aparece mascarado.

## LLM

Funciona com qualquer API compatível com OpenAI. `LLM_BASE_URL` é a base (`.../v1`), e o `/chat/completions` é acrescentado pelo backend.

| Provedor | `LLM_BASE_URL` | `LLM_MODEL` |
|---|---|---|
| Groq (em uso, gratuito com 8k tokens/min) | `https://api.groq.com/openai/v1` | `openai/gpt-oss-120b` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| vLLM ou Ollama local | `http://host:porta/v1` | nome do modelo |

## Limitações do MVP

- O usuário da sessão é fixo (`SESSION_USER_ID=89` no front) até a integração com o login do Desafio 01.
- A Groq gratuita aguenta de 2 a 3 perguntas por minuto. Para a apresentação, considere uma chave paga (Groq Dev tier ou OpenAI).
- O filtro de prestadores roda em Python sobre os 500 registros, com cache de 5 minutos. Para um catálogo grande, mover para SQL com `unaccent`/`pg_trgm`.
- As regras gerais da base de conhecimento (carência de 7 dias, formas de pagamento, dependentes aceitos) vieram do briefing. Agora ficam em `regras/regras-negocio.json`; confirme os valores com a PO.
- Anexos do chat não são enviados ao backend. Só o nome do arquivo aparece na conversa.
- O limite de 12 mensagens por minuto por conversa fica em memória: com várias réplicas, mover para Redis. Corpo do chat: até 50 mensagens de 4.000 caracteres cada.
