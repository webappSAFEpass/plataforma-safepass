# CLAUDE.md — Backend SAFEpass

API da plataforma SAFEpass (gestão integrada de benefícios em saúde e bem-estar), desenvolvida por 5 squads da Residência Tecnológica UCB × Porto Digital. Este backend é um **monólito modular**: uma única aplicação FastAPI, um único PostgreSQL, com cada domínio isolado em seu próprio módulo.

## Stack

- **Python 3.12** + **FastAPI**
- **PostgreSQL 16** via **SQLAlchemy 2.0** (ORM, estilo `Mapped[...]`, sessões síncronas) + driver **psycopg 3**
- **Alembic** para migrations
- **Pydantic v2** para schemas e **pydantic-settings** para configuração
- **uv** para dependências (`pyproject.toml` + `uv.lock`)
- **Ruff** (lint + format), **mypy** (tipagem), **pytest** + **pytest-cov** (testes)
- **Docker** para execução local e deploy; **GitHub Actions** para CI/CD

## Comandos

```bash
uv sync                                  # instala dependências
uv run fastapi dev app/main.py           # servidor local com reload (http://localhost:8000/docs)
uv run pytest                            # todos os testes
uv run pytest tests/unit                 # só unitários (não precisam de banco)
uv run pytest --cov=app --cov-report=term-missing
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run alembic revision --autogenerate -m "descricao"   # nova migration
uv run alembic upgrade head
docker compose up --build                # (na raiz do repo) sobe db + backend + frontend
```

Antes de considerar uma tarefa concluída: `ruff check`, `ruff format --check`, `mypy` e `pytest` devem passar — são os mesmos passos do CI.

## Estrutura

```
backend/
├── app/
│   ├── main.py                 # cria o FastAPI, registra routers e exception handlers
│   ├── core/
│   │   ├── config.py           # Settings (pydantic-settings), lido de variáveis de ambiente
│   │   ├── database.py         # engine, SessionLocal, Base declarativa, get_db()
│   │   ├── security.py         # JWT, hash de senha
│   │   ├── dependencies.py     # get_current_user, require_role(...), paginação
│   │   └── exceptions.py       # exceções de domínio base + handlers HTTP
│   ├── shared/                 # utilitários realmente compartilhados (mixins de model, Page[T], clock)
│   └── modules/
│       └── <modulo>/
│           ├── router.py       # endpoints HTTP (camada fina)
│           ├── schemas.py      # Pydantic: entrada/saída da API
│           ├── models.py       # SQLAlchemy: tabelas
│           ├── repository.py   # acesso a dados (queries)
│           ├── service.py      # regras de negócio
│           └── exceptions.py   # erros de domínio do módulo
├── alembic/                    # migrations
├── tests/
│   ├── conftest.py
│   ├── unit/modules/<modulo>/  # testes de service com repositórios falsos
│   └── integration/            # testes de router/repository com PostgreSQL real
├── Dockerfile
├── pyproject.toml
└── .env.example
```

### Módulos e responsabilidade por desafio

| Módulo | Desafio | Conteúdo |
|---|---|---|
| `auth`, `users` | 01 | cadastro, login, JWT, perfis, RBAC |
| `plans`, `subscriptions` | 01 | planos, limites, assinaturas, gateway de pagamento |
| `providers`, `companies` | 03 | perfil do prestador, categorias, tags, faixa de preço, empresas |
| `marketplace` | 02 | busca, filtros, ordenação, paginação, favoritos |
| `reviews` | 02 | avaliações permanentes, resposta do prestador, média |
| `points` | 02 | carteira de pontos e extrato |
| `coupons` | 02 | cupons, campanhas por plano, resgate, tokens |
| `dependents` | 02 / 04 | dependentes (pessoas e pets), permissões do gestor |
| `documents`, `medications` | 04 | histórico médico, upload, OCR, cronograma de medicação |
| `dashboard` | 02 | agregação de leitura (plano, limites, pontos, alertas, agenda 7 dias, cupons ativos) |

O assistente de IA (Desafio 05) vive em `../assistente-ia` e consome esta API via HTTP — ele **não** acessa o banco diretamente.

## Arquitetura em camadas

Fluxo obrigatório: **router → service → repository → banco**. Cada camada só conhece a de baixo.

- **router.py** — recebe a requisição, valida via schema, injeta dependências com `Depends`, chama **um** método do service e devolve um schema de resposta. Sem regra de negócio, sem query.
- **service.py** — toda regra de negócio. Não importa nada de `fastapi` (nada de `HTTPException`, `Request`, `Depends`). Recebe repositórios e colaboradores pelo construtor, o que permite testar com fakes. Lança exceções de domínio.
- **repository.py** — única camada que escreve queries SQLAlchemy. Retorna models ou tipos simples; não decide regra de negócio.
- **models.py / schemas.py** — models nunca são retornados direto pela API; sempre converter para um schema de resposta (`model_config = ConfigDict(from_attributes=True)`).

Exemplo de ligação:

```python
# modules/coupons/router.py
def get_coupon_service(db: Session = Depends(get_db)) -> CouponService:
    return CouponService(CouponRepository(db), PointsRepository(db), clock=SystemClock())

@router.post("/{coupon_id}/redemptions", response_model=RedemptionOut, status_code=201)
def redeem_coupon(
    coupon_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    service: CouponService = Depends(get_coupon_service),
) -> RedemptionOut:
    return service.redeem(user, coupon_id)
```

### Comunicação entre módulos

- Um módulo pode chamar o **service** (ou repository) público de outro módulo; nunca importar o `router` de outro módulo.
- Evitar importações circulares: se dois módulos precisam um do outro, extrair a parte comum ou depender de uma interface (`Protocol`).
- Quando um módulo de outro squad ainda não existe, criar um `Protocol` + implementação fake/mock e combinar o contrato (schema OpenAPI) com o squad responsável. Trocar pela implementação real quando pronta.

### Erros

- Cada módulo define exceções herdando de `core.exceptions.DomainError` (ex.: `InsufficientPointsError(DomainError)`, com `status_code = 422` e `code = "insufficient_points"`).
- Um exception handler global em `main.py` converte para o formato padrão:
  ```json
  { "error": { "code": "insufficient_points", "message": "Saldo de pontos insuficiente." } }
  ```
- Nunca expor stack trace, SQL ou dados sensíveis na resposta.

## Convenções de API

- Prefixo `/api/v1`. Recursos no plural, em inglês e kebab-case: `/api/v1/providers`, `/api/v1/coupons/{id}/redemptions`.
- Verbos HTTP corretos: `GET` lê, `POST` cria, `PATCH` atualiza parcialmente, `DELETE` remove. Status: 200, 201 (criação), 204 (sem corpo), 400/422 (validação/regra), 401, 403, 404, 409 (conflito).
- Listagens sempre paginadas: `?page=1&size=20` → `{ "items": [...], "total": 0, "page": 1, "size": 20 }`.
- Filtros e ordenação via query string (`?category=...&tags=a,b&min_price=...&sort=name`).
- Todo endpoint declara `response_model`, `summary` e tags — o OpenAPI (`/docs`, `/openapi.json`) é o **contrato** entre squads e com o frontend, que gera tipos a partir dele.
- JSON em `snake_case`. IDs são `UUID`. Datas em ISO 8601 com timezone (UTC).

## Regras de negócio (Desafio 02 e dependências)

Estas regras devem estar em services e cobertas por testes unitários:

- **Marketplace**: sem filtros, listar todos os prestadores em ordem alfabética. Filtros por texto (prestador), categoria, faixa de preço e tags.
- **Avaliações**: permanentes (sem hard delete); prestador pode responder; histórico preservado. Ao criar uma avaliação, recalcular a média do prestador na mesma transação. Avaliações válidas geram pontos.
- **Pontos**: o extrato é um **ledger append-only** (`point_transactions` com tipo crédito/débito, valor, origem, data). Nunca editar ou apagar lançamentos; correções são novos lançamentos. Saldo nunca pode ficar negativo. Pontos são inteiros.
- **Cupons**: disponibilidade depende do plano; cupons de planos superiores aparecem como bloqueados (a API retorna `locked: true` + plano necessário). O resgate, na **mesma transação**: valida plano e permissão → debita pontos → gera token único → validade de **7 dias**. Estados: `available`, `redeemed`, `used`, `expired`. Registrar datas de resgate, vencimento e uso.
- **Dependentes**: pessoas ou pets, vinculados a uma conta gestora, que concentra pontos e limites do plano. Por padrão **não** podem resgatar cupons; o gestor libera individualmente (`can_redeem_coupons`). Podem buscar prestadores, ver perfis, avaliar, contatar e usar benefícios já resgatados para eles.
- **Dashboard**: endpoint de leitura agregada; não duplicar regra — chamar os services dos outros módulos.

Operações que alteram saldo/estoque devem usar transação e bloqueio adequado (`SELECT ... FOR UPDATE`) para evitar resgate duplo.

## Banco de dados

- Toda mudança de schema via **migration Alembic** revisada no PR. Nunca `Base.metadata.create_all` fora de testes.
- Tabelas no plural e `snake_case`. Toda tabela tem `id UUID`, `created_at`, `updated_at` (`TIMESTAMPTZ`, UTC) via mixin em `shared/`.
- Chaves estrangeiras e índices explícitos para colunas usadas em filtros (categoria, tags, `user_id`, status).
- Dados que não podem ser apagados (avaliações, extrato, resgates) usam soft delete ou são imutáveis.
- Sessão por requisição via `get_db()`; commit no service ao final da operação (ou em um helper de unidade de trabalho), nunca no repository de forma espalhada.

## Segurança e LGPD

- Autenticação por JWT (Desafio 01). Toda rota não pública depende de `get_current_user`; autorização por papel com `require_role("user" | "dependent" | "provider" | "company" | "admin")`.
- Verificar **posse do recurso** no service (um usuário só vê seus dependentes, seus cupons, seus documentos).
- Segredos só por variável de ambiente; `.env` nunca é commitado — manter `.env.example` atualizado.
- Não logar senhas, tokens, documentos, dados de saúde ou CPF. Dados de saúde são sensíveis (LGPD): acesso mínimo necessário.
- CORS restrito às origens configuradas em `Settings`.

## Código limpo

- Tipagem completa em funções públicas; `mypy` deve passar. Nada de `Any` sem justificativa.
- Funções pequenas, com um único propósito e nomes descritivos. Early return em vez de `if` aninhado.
- Sem números mágicos: constantes nomeadas (`COUPON_VALIDITY_DAYS = 7`).
- Código (variáveis, funções, classes, tabelas, rotas) em **inglês**; mensagens para o usuário e documentação em **português**.
- Datas sempre timezone-aware (`datetime.now(UTC)`). Para testabilidade, services que dependem do tempo recebem um `Clock` injetado.
- Não criar abstrações "para o futuro": sem repositório genérico, sem camadas extras além das descritas aqui.
- Comentários explicam o **porquê**, não o quê.

## Testes

- **Unitários** (`tests/unit`) — foco principal. Testam services isoladamente com repositórios fake em memória (ou `Mock`) e `Clock` fixo. Rápidos, sem banco, sem rede.
- **Integração** (`tests/integration`) — endpoints via `TestClient` e repositories contra PostgreSQL real (serviço no CI / container local), com rollback por teste.
- Padrão AAA (Arrange, Act, Assert). Nome: `test_<acao>_<condicao>_<resultado>`, ex.: `test_redeem_coupon_without_permission_raises_forbidden`.
- Toda regra de negócio listada acima tem teste do caminho feliz **e** dos casos de erro.
- Cobertura mínima de **80%** (o CI falha abaixo disso). Bugs corrigidos ganham um teste de regressão.
- Use factories/fixtures em `conftest.py` em vez de repetir montagem de objetos.

## Docker

- `Dockerfile` multi-stage: estágio de build com `uv sync --frozen --no-dev`, estágio final `python:3.12-slim` apenas com o `.venv` e o código.
- Rodar como usuário não-root; expor `8000`; comando `fastapi run app/main.py --port 8000`.
- Endpoint `GET /health` para healthcheck.
- Migrations rodam como passo separado (`alembic upgrade head`) antes de iniciar a API, não dentro do `main.py`.
- `.dockerignore` exclui `.venv`, `.env`, `__pycache__`, `tests` e caches.

## CI/CD (GitHub Actions)

Workflow `.github/workflows/backend.yml` na raiz do repositório, disparado apenas por mudanças em `backend/**`:

1. **lint** — `ruff check` e `ruff format --check`
2. **typecheck** — `mypy app`
3. **test** — `pytest --cov=app --cov-fail-under=80` com serviço `postgres:16`
4. **build** — `docker build` da imagem
5. **deploy** (apenas push na `main`) — publica a imagem no GHCR com tag do SHA e `latest`, e dispara o deploy do ambiente

Pull requests só são mergeados com o CI verde e ao menos uma revisão.

## Git

- Branches: `feat/<modulo>-<descricao>`, `fix/...`, `chore/...`. Nunca commitar direto na `main`.
- Commits no padrão **Conventional Commits**: `feat(coupons): gera token com validade de 7 dias`.
- PRs pequenos, com descrição do que muda e como testar; migrations e mudanças de contrato de API destacadas.
