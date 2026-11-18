# SAFEpass — Backend integrado

Monólito modular (Python 3.12, FastAPI, PostgreSQL 16, SQLAlchemy 2 síncrono, psycopg 3,
Pydantic 2, Alembic) que reúne os backends dos squads:

| Branch | Desafio | Módulos |
|---|---|---|
| `feature/squad-23` | 01 | `auth`, `users`, `plans`, `subscriptions`, `platform_reviews`, `referrals`, `stats` |
| `feature/squad-46` | 02 | `marketplace`, `reviews`, `points`, `coupons`, `dependents`, `alerts`, `dashboard` |
| `feature/squad-47` | 03 | `providers`, `companies` |

Como as peças se ligam (identidade, plano, catálogo, migrations) está em
[docs/INTEGRACAO_BACKENDS.md](docs/INTEGRACAO_BACKENDS.md). O contrato do Desafio 01 está em
[docs/INTEGRACAO.md](docs/INTEGRACAO.md). IA está fora do escopo.

## Instalação e banco local

Execute em `backend/`, com Python 3.12, uv e Docker/Compose disponíveis:

```bash
uv sync
docker compose -p safepass up -d --wait db
uv run alembic upgrade head
uv run alembic check
```

A conexão padrão aponta para o banco local do Compose, na porta 55432. As
credenciais do Compose são exclusivamente de desenvolvimento. Para outra
instância, defina `DATABASE_URL` por ambiente ou `.env` (veja `.env.example`).
Migrations são um passo explícito; a aplicação não executa `create_all` nem
migrations durante o startup.

## Executar e experimentar a API

A aplicação normal autentica com o JWT do Desafio 01 (cookie `access_token` ou
`Authorization: Bearer`). Para popular planos e o admin inicial:

```bash
uv run python -m scripts.seed
uv run fastapi dev app/main.py
```

Para experimentar os módulos dos Desafios 02/03 sem passar pelo cadastro, use
explicitamente a identidade **fictícia local** (catálogo de prestadores continua real):

```bash
uv run python -m scripts.dev
```

Este comando liga somente em `127.0.0.1:8000`. Nunca o use em produção ou com
exposição pública. O aplicativo normal `app.main:app` não ativa esses adapters.
Identidades do adapter local (só em `scripts.dev` e nos testes):

| Bearer fictício | Papel | Observação |
|---|---|---|
| `local-manager` | `user` (gestor) | Tem `plan_id` definido; cupons gated por plano aparecem desbloqueados para ele |
| `local-other-manager` | `user` (gestor) | Sem plano; útil para testar cupons bloqueados |
| `local-dependent` | `dependent` | Só atua se houver um `Dependent.linked_user_id` apontando para ele |
| `local-owner` / `local-other` | `provider`, `company` | Donos de prestador/empresa (Desafio 03) |
| `local-admin` | `admin` | Aprova prestadores, cria categorias e tags |
| `local-employee` | `user` | Funcionário vinculável a empresa/prestador |

Verificação HTTP e primeiro fluxo:

```bash
curl --fail-with-body http://127.0.0.1:8000/health
curl --fail-with-body http://127.0.0.1:8000/api/v1/prestadores \
  -H 'Authorization: Bearer local-manager'
curl --fail-with-body http://127.0.0.1:8000/api/v1/dashboard \
  -H 'Authorization: Bearer local-manager'
```

A lista de prestadores vem do módulo `providers` (só perfis aprovados). Não há `POST /cupons`: o catálogo de cupons ainda não tem dono definido, então os
cupons usados nos testes são semeados diretamente no banco. O contrato vivo está
em `/docs` e `/openapi.json`.

## Endpoints principais

Todos abaixo usam prefixo `/api/v1`; listagens aceitam `page` e `size` (máximo
100).

| Recurso | Operações |
|---|---|
| `/dashboard` | GET: visão consolidada (plano, pontos, dependentes, alertas, agenda de 7 dias, cupons ativos) |
| `/auth/*`, `/plans`, `/subscriptions`, `/platform-reviews`, `/referrals`, `/admin/*` | Desafio 01 (ver docs/INTEGRACAO.md) |
| `/providers`, `/provider-*`, `/service-definitions`, `/companies` | Desafio 03 (ver `/docs`) |
| `/prestadores` | GET com filtros `q`, `categoria`, `preco`, `tags` |
| `/prestadores/{id}` | GET perfil |
| `/prestadores/{id}/avaliacoes` | GET (lista + média) e POST (cria avaliação, credita pontos ao gestor) |
| `/favoritos` | GET lista; `/favoritos/{providerId}` PUT favorita, DELETE remove |
| `/pontos/saldo`, `/pontos/extrato` | GET saldo e extrato (ledger append-only) |
| `/cupons` | GET catálogo, com `locked: true` para cupons fora do plano |
| `/cupons/{id}/resgates` | POST resgata (aceita header opcional `Idempotency-Key`) |
| `/resgates` | GET histórico, filtros `status`, `de`, `ate` |
| `/resgates/{token}/utilizacao` | POST marca o token como utilizado |
| `/dependentes` | GET lista; POST cria; `/dependentes/{id}` PATCH edita/libera resgate, DELETE remove (lógico) |
| `/alertas` | GET lista; POST cria alerta manual |

Exemplo de resgate:

```bash
curl --fail-with-body -X POST http://127.0.0.1:8000/api/v1/cupons/<coupon-id>/resgates \
  -H 'Authorization: Bearer local-manager' -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 11111111-1111-1111-1111-111111111111' \
  --data '{}'
```

## Testes e checks

Crie um banco separado (somente na primeira execução):

```bash
docker compose -p safepass exec -T db createdb -U safepass safepass_test
export TEST_DATABASE_URL=postgresql+psycopg://safepass:safepass_local@127.0.0.1:55432/safepass_test
uv run pytest --cov=app --cov-report=term-missing --cov-fail-under=80
uv run ruff check . && uv run ruff format --check .
uv run mypy app
```

A suíte aplica migrations no banco terminado em `_test`; cada teste de integração
usa transação externa/savepoints, com rollback ao final, inclusive quando o
service executa commit. Ausência de `TEST_DATABASE_URL` falha explicitamente. Os
unitários rodam sem banco: `uv run pytest tests/unit`.

## Container da API

```bash
docker build -t safepass-backend:local .
```

Imagem multi-stage, dependências congeladas e usuário sem root. As migrations
precisam rodar separadamente antes da API. Configure `DATABASE_URL` para um host
alcançável pelo container (por exemplo `host.docker.internal` ao testar local no
macOS/Windows), não seu loopback.

## Limites e decisões

Decisões de cada squad: [Squad 46](docs/decisions.md) e
[Squad 47](docs/decisions-squad47.md); validações: [Squad 46](docs/validation.md) e
[Squad 47](docs/validation-squad47.md). Algumas pendências citadas ali (adapter real
de identidade e de catálogo) foram resolvidas pela integração. IA (E8/US15/US16) está
fora do escopo.
