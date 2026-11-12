# Plataforma SAFEpass

Plataforma de gestão integrada de benefícios em saúde e bem-estar, desenvolvida pelos squads da Residência Tecnológica UCB × Porto Digital. Este repositório reúne o código de todos os squads. Cada parte do sistema tem uma pasta, e cada squad trabalha em módulos próprios dentro dela.

## Estrutura

```
plataforma-safepass/
├── frontend/        app web (Next.js): telas de todos os squads
├── backend/         API principal (FastAPI): monólito modular, um módulo por domínio
├── assistente-ia/   assistente de IA (FastAPI) do Desafio 05; consome o backend por HTTP
└── .github/
    └── workflows/   um workflow por pasta, disparado só quando ela muda
```

| Pasta | Stack | Padrões detalhados |
|---|---|---|
| `frontend/` | Next.js (App Router), React, TypeScript, Tailwind, pnpm | [`frontend/CLAUDE.md`](frontend/CLAUDE.md) |
| `backend/` | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, uv | [`backend/CLAUDE.md`](backend/CLAUDE.md) |
| `assistente-ia/` | Python, FastAPI, LLM com tool calling, pgvector | [`assistente-ia/README.md`](assistente-ia/README.md) |

Os `CLAUDE.md` são a referência de arquitetura de cada pasta. Este README resume o essencial para quem está chegando.

## Arquitetura

### Frontend: organizado por feature

Tudo de um domínio fica junto em `src/features/<feature>/`. A pasta `src/app/` só define rotas e compõe páginas.

```
frontend/src/
├── app/                        rotas (URLs em português)
│   ├── (public)/               landing, login, cadastro
│   └── (authenticated)/        área logada; layout.tsx com header e sidebar
│       └── <rota>/page.tsx     página fina: título + componentes da feature
├── features/
│   └── <feature>/              nome em inglês: coupons, marketplace, provider-area...
│       ├── components/         componentes da feature
│       ├── hooks/              useQuery/useMutation da feature
│       ├── api.ts              chamadas HTTP (usa lib/api/client.ts)
│       ├── schemas.ts          schemas Zod dos formulários
│       ├── types.ts            tipos derivados do OpenAPI
│       ├── index.ts            API pública: o que outras partes podem importar
│       └── __tests__/
├── components/
│   ├── ui/                     primitivos sem regra de negócio (Button, Card, Input...)
│   └── layout/                 header, sidebar, título de página
├── lib/                        utilitários (cn, formatadores pt-BR, cliente da API)
└── mocks/                      handlers MSW para testes e para endpoints que ainda não existem
```

Regras principais:

- Server Components por padrão; `"use client"` só onde há estado, eventos ou APIs do navegador.
- Nenhum `fetch` solto em componente: as chamadas passam por `features/<feature>/api.ts`.
- Uma feature importa outra só pelo `index.ts` dela, e nunca importa de `app/`.
- Estilo só com Tailwind e os tokens do tema. Sem cor em hex solta e sem CSS inline.

### Backend: monólito modular em camadas

Cada domínio é um módulo em `backend/app/modules/<modulo>/`, e o fluxo é sempre **router → service → repository → banco**.

```
backend/app/modules/<modulo>/
├── router.py       endpoints HTTP (camada fina)
├── schemas.py      Pydantic: entrada e saída da API
├── models.py       SQLAlchemy: tabelas
├── repository.py   queries
├── service.py      regras de negócio (sem nada de FastAPI)
└── exceptions.py   erros de domínio
```

Um módulo usa outro pelo service ou repository público, nunca pelo router. O OpenAPI (`/openapi.json`) é o contrato com o frontend e entre os squads.

### Assistente de IA

O `assistente-ia/` é uma aplicação separada. Ela orquestra o LLM (prompt, ferramentas, consentimento LGPD, RAG e streaming) e lê dados por HTTP. O chat do front fica em `frontend/src/features/assistant/` e fala com o assistente só pelo servidor do Next (rotas em `src/app/api/`), para o token nunca chegar ao navegador.

## Como um squad adiciona uma feature

### No frontend

1. Crie `frontend/src/features/<feature>/` com `components/`, `index.ts` e `__tests__/`. Adicione `api.ts`, `hooks/`, `schemas.ts` e `types.ts` quando precisar.
2. Exporte pelo `index.ts` só o que as páginas vão usar.
3. Crie a rota em `frontend/src/app/(authenticated)/<rota>/page.tsx`. A página só monta o título e os componentes da feature.
4. Se a tela entra na navegação, adicione o item em `src/components/layout/`.
5. Se o endpoint de outro squad ainda não existe, use um handler MSW em `src/mocks/` seguindo o contrato combinado. Quando a API ficar pronta, troque sem mexer nos componentes.
6. Escreva os testes em `__tests__/` (Vitest + Testing Library). A cobertura mínima é 70% em `src/features` e `src/lib`.

### No backend

1. Crie `backend/app/modules/<modulo>/` com as camadas acima.
2. Registre o router em `app/main.py` com prefixo `/api/v1/<recurso>`.
3. Mudou o banco? Crie uma migration Alembic: `uv run alembic revision --autogenerate -m "descricao"`.
4. Escreva testes unitários do service (com repositórios falsos) e de integração do router. A cobertura mínima é 80%.

## Como rodar

Cada pasta roda sozinha. Suba só o que for usar.

### Frontend

Pré-requisitos: Node 22 e pnpm (`corepack enable`).

```bash
cd frontend
pnpm install
cp .env.example .env.local   # URL e token do assistente; só no servidor
pnpm dev                     # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `pnpm lint` | ESLint |
| `pnpm format:check` | Prettier |
| `pnpm typecheck` | TypeScript |
| `pnpm test` / `pnpm test:coverage` | Vitest, com ou sem cobertura |
| `pnpm build` | build de produção |

### Assistente de IA

Pré-requisito: Python 3.12 ou mais novo.

```bash
cd assistente-ia
make install
cp .env.example .env         # SERVICE_TOKENS, DATABASE_URL, LLM_API_KEY
make run                     # http://localhost:8000/v1
```

Sem `DATABASE_URL`, roda em memória com dados fictícios. `make check` roda lint, tipos e testes.

### Backend

Pré-requisitos: Python 3.12, [uv](https://docs.astral.sh/uv/) e PostgreSQL 16.

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py   # http://localhost:8000/docs
```

O backend reúne os módulos dos Desafios 01 a 03. Veja [`backend/README.md`](backend/README.md) e [`backend/docs/INTEGRACAO_BACKENDS.md`](backend/docs/INTEGRACAO_BACKENDS.md).

### Tudo junto com Docker

Na raiz, sobe banco, migrations, backend, frontend e o Mailpit (e-mails de desenvolvimento). O assistente de IA ainda não está no compose.

```bash
docker compose up --build
```

| Serviço | URL |
|---|---|
| Site (Next.js) | http://localhost:3000 |
| API / Swagger | http://localhost:8000/docs |
| Mailpit | http://localhost:8025 |
| PostgreSQL | localhost:5432 |

O admin de desenvolvimento é `admin@example.com` / `Admin12345`, definido no `compose.yaml`. Use só localmente. `docker compose down -v` também apaga o banco local.

O frontend fala com o backend pelo mesmo domínio: o Next reescreve `/api/v1/*` para `API_URL` (lida no build; veja `frontend/.env.example`). Sem Docker, copie `backend/.env.example` para `backend/.env` e rode o frontend com `pnpm dev`.

## Fluxo de trabalho

1. Crie sua branch a partir da `develop`: `feature/<descricao>`, `fix/<descricao>` ou `chore/<descricao>`.
2. Commits em [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat(coupons): gera token com validade de 7 dias`.
3. Abra o PR para a `develop`. Ele precisa de CI verde e de pelo menos uma revisão.
4. A `develop` vai para a `main` quando estiver estável. Ninguém commita direto na `main`.

PRs pequenos, com descrição, instruções de teste e, em mudanças visuais, screenshots de desktop e mobile.
