# Migração para o repositório oficial

Checklist para levar este backend para o repositório da empresa sem perder histórico e sem quebrar o front.

## 1. Levar o código com o histórico

Repositório oficial **vazio**:

```bash
git remote add oficial <url-do-repo-oficial>
git push oficial main
```

Repositório oficial **com código** (o backend entra numa subpasta, com o histórico):

```bash
# no clone do repositório oficial
git remote add safepass-backend <url-deste-repo>
git fetch safepass-backend
git subtree add --prefix=backend safepass-backend main
```

Com subpasta, ajuste o `working-directory` do workflow de CI e o contexto do build do Docker para `backend/`.

Nada sensível vai junto: o `.env` nunca foi commitado (está no `.gitignore`), e o histórico não tem chaves.

## 2. Segredos e variáveis no ambiente novo

Crie no provedor de deploy (e, se precisar, em *Settings → Secrets* do repositório):

| Variável | Obrigatória | O que é |
| --- | --- | --- |
| `SERVICE_TOKENS` | Sim | `token:usuarios`. Gere um token novo (`python3 -c "import secrets; print(secrets.token_urlsafe(32))"`), não reaproveite o deste repo |
| `DATABASE_URL` | Sim, em produção | Connection string do Supabase oficial (Session pooler) |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Sim | Provedor de IA. Use uma chave paga em produção (a Groq gratuita aguenta 2 a 3 perguntas por minuto) |
| `EMBEDDINGS_API_KEY` | Não | Liga o RAG. Sem ela, a base inteira vai no prompt |
| `REGRAS_PATH` | Não | Outro arquivo de regras (ex.: homologação). Padrão: `regras/regras-negocio.json` |
| `EXPOSE_DOCS`, `LOG_JSON`, `CHAT_TIMEOUT_S`, `CHAT_RATE_PER_MIN` | Não | Ver `.env.example` |

O CI não precisa de segredo: os testes usam LLM falso e um Postgres próprio.

## 3. Banco oficial

```bash
python -m scripts.db migrate          # tabelas do assistente + RLS (não altera as tabelas do squad)
python -m scripts.db documents --yes  # só se quiser os documentos fictícios da demo
python -m scripts.db ingest-kb --yes  # só com EMBEDDINGS_API_KEY
```

O backend espera as tabelas do squad (`usuario`, `dependente`, `pet`, `planos`, `prestador`) no formato de `tests/fixtures/squad_schema.sql`. Se o banco oficial tiver outra estrutura, ajuste só `app/repos/postgres.py` e `app/repos/mapping.py`. A suíte de contrato (`tests/test_repo_contract.py`) diz se o resultado continua igual.

## 4. Regras de negócio

Revise `regras/regras-negocio.json` com a PO antes do primeiro deploy. O número do WhatsApp e o horário de atendimento do repositório são de demonstração. O guia de edição está em `regras/README.md`.

## 5. Front

- O front fala com o backend só pelo servidor (route handler ou server function), com `BACKEND_API_URL=<host>/v1` e `BACKEND_API_TOKEN`.
- O contrato fica em `openapi.json`. Depois de qualquer mudança na API, rode `make openapi`, e o front regera os tipos (`npx openapi-typescript openapi.json -o <pasta>/contracts.ts`). Um teste falha se o arquivo estiver desatualizado.
- O `/v1/chat/stream` é SSE, que o OpenAPI não descreve. Os eventos são `token` `{text}`, `reset` `{}`, `card` (Card), `done` (ChatResponse) e `error` `{error}`.

## 6. Conferir depois de migrar

- [ ] CI verde no repositório oficial (lint, mypy, testes, regras, lockfile)
- [ ] `GET /health` e `GET /ready` respondem 200 no ambiente novo
- [ ] `make test-live` passa contra o LLM de produção
- [ ] O front aponta para a URL nova e o chat responde com cards
- [ ] Repositório antigo arquivado, com um link para o novo no README
