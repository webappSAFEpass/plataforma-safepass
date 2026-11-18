# SAFEpass — Backend Squad 47

Primeira implementação dos módulos `providers` e `companies`, na branch
`feature/squad-47`. Python 3.12, FastAPI, PostgreSQL 16, SQLAlchemy 2 síncrono,
psycopg 3, Pydantic 2 e Alembic. Frontend preservado.

## Instalação e banco local

Execute em `backend/`, com Python 3.12, uv e Docker/Compose disponíveis:

```bash
uv sync --frozen
docker compose -p safepass47 up -d --wait db
uv run alembic upgrade head
uv run alembic check
```

A conexão padrão aponta para o banco local do Compose, na porta 55432.
As credenciais do Compose são exclusivamente de desenvolvimento.
Para outra instância, defina `DATABASE_URL` por ambiente ou `.env` (veja
`.env.example`). Não sobrescreva um `.env` existente nem use essas credenciais
em produção. O volume nomeado preserva dados entre reinícios; processos não
sobrevivem ao encerramento de um ambiente. `docker compose down` preserva o volume;
não use `down -v` se precisar dos dados.

Migrations são um passo explícito; a aplicação não executa `create_all` nem
migrations durante o startup. Não há SQLite como substituto de PostgreSQL.

## Executar e experimentar a API

Sem integração de identidade, a aplicação normal recusa operações protegidas:

```bash
uv run fastapi dev app/main.py
```

Para experimentar com identidades **fictícias locais**, use explicitamente:

```bash
uv run python -m scripts.dev
```

Este comando liga somente em `127.0.0.1:8000`. Nunca o use em produção ou com
exposição pública. O aplicativo normal `app.main:app` não ativa esse adapter,
mesmo que receba um dos tokens locais. Não há login, senha, emissão de JWT nem
tabela de usuários concorrente ao Squad 1.

Identidades do adapter local:

| Bearer fictício | UUID | Papéis |
|---|---|---|
| `local-owner` | `10000000-0000-0000-0000-000000000001` | provider, company |
| `local-admin` | `10000000-0000-0000-0000-000000000002` | admin |
| `local-employee` | `10000000-0000-0000-0000-000000000003` | user |
| `local-other` | `10000000-0000-0000-0000-000000000004` | provider, company |

Verificação HTTP e primeiro cadastro:

```bash
curl --fail-with-body http://127.0.0.1:8000/health
curl --fail-with-body -X POST http://127.0.0.1:8000/api/v1/providers \
  -H 'Authorization: Bearer local-owner' -H 'Content-Type: application/json' \
  --data '{"display_name":"Minha clínica","description":"Descrição pública"}'
```

Use o UUID retornado nas rotas administrativas. O contrato vivo está em `/docs`
e `/openapi.json`. O cadastro inicia `pending`: a rota pública retorna 404 até
um admin enviar `POST /api/v1/providers/{id}/approval-decisions`, com
`{"decision":"approved","reason":"Verificação humana concluída"}`.

Para vincular funcionários, use um UUID já conhecido do adapter de identidade.
O backend não inventa e-mail, conta ou convite. Para a empresa, um exemplo de CNPJ
numérico válido é `11.222.333/0001-81`; não representa cadastro/validação na Receita.

## Endpoints principais

Todos abaixo usam prefixo `/api/v1`; listagens aceitam `page` e `size` (máximo 100).

| Recurso | Operações |
|---|---|
| `/providers` | POST autenticado; GET público de aprovados |
| `/provider-accounts` | GET dos contextos acessíveis, incluindo pendentes |
| `/providers/{id}` | GET público; PATCH administrativo parcial |
| `/providers/{id}/profile` | GET administrativo |
| `/providers/{id}/approval-decisions` | POST admin: aprovação/rejeição |
| `/provider-categories`, `/provider-tags` | GET público; POST admin |
| `/service-definitions` | GET público com `search`; POST admin |
| `/providers/{id}/services` | GET/POST administrativo |
| `/providers/{id}/services/{link_id}` | PATCH de preço/faixa e disponibilidade |
| `/providers/{id}/public-services` | GET público: somente ativos e perfil aprovado |
| `/providers/{id}/service-requests` | GET/POST de solicitações pendentes |
| `/providers/{id}/service-requests/{request_id}/decisions` | POST admin |
| `/providers/{id}/professional-records` | POST do cadastro profissional |
| `/providers/{id}/professionals` | GET/POST dos vínculos |
| `/providers/{id}/professionals/{link_id}` | PATCH e DELETE lógico |
| `/companies` | POST e GET dos contextos administráveis |
| `/companies/{id}` | GET e PATCH parcial |
| `/companies/{id}/employees` | GET/POST; busca por matrícula/departamento e filtro `active` |
| `/companies/{id}/employees/{employee_id}` | PATCH e DELETE lógico |

Preço: informe `price` OU `min_price` + `max_price`, sem misturá-los; valores
não negativos e até duas casas decimais. O PATCH de preço recebe o conjunto
completo do preço/faixa (troca atômica), não somente uma ponta da faixa.
Para desativar serviço, envie também seu preço/faixa atual e `active: false`.
Uma solicitação aprovada aponta para serviço existente no catálogo; não associa
preço automaticamente. O prestador escolhe o preço depois.

## Testes e checks

Crie um banco separado (somente na primeira execução):

```bash
docker compose -p safepass47 exec -T db createdb -U safepass safepass_test
export TEST_DATABASE_URL=postgresql+psycopg://safepass:safepass_local@127.0.0.1:55432/safepass_test
uv run pytest --cov=app --cov-report=term-missing --cov-fail-under=80
uv run ruff check .
uv run ruff format --check .
uv run mypy app
```

Se o banco já existir, não repita `createdb`. A suíte aplica migrations no banco
terminado em `_test`; cada teste de integração usa transação externa/savepoints,
com rollback ao final, inclusive quando o service executa commit. Não aponte
`TEST_DATABASE_URL` para um banco real. Ausência da variável falha explicitamente,
sem apresentar testes PostgreSQL não executados como aprovados.

Os unitários podem rodar sem banco: `uv run pytest tests/unit`.

O ciclo destrutivo `alembic downgrade base` deve ser exercitado **somente em banco
descartável**; não é comando de inicialização ou manutenção normal.

## Container da API

```bash
docker build -t safepass47-backend:local .
```

Imagem multi-stage, dependências congeladas e usuário sem root. As migrations
precisam rodar separadamente antes da API. O container usa `app.main`, sem adapter
local; identidade real continua uma dependência de integração. Configure
`DATABASE_URL` para um host alcançável pelo container, não seu loopback.

Em ambiente com proxy HTTPS corporativo, passe os build args padrão de proxy e,
se necessário, um bundle de confiança pelo secret de build `build_ca`:

```bash
docker build --build-arg HTTPS_PROXY --build-arg HTTP_PROXY --build-arg NO_PROXY \
  --secret id=build_ca,src="$SSL_CERT_FILE" -t safepass47-backend:local .
```

O bundle não é copiado para a imagem final; TLS e checksums permanecem verificados.

## Limites e decisões

Veja [decisões e integração](docs/decisions.md) para requisitos novos, permissões,
limitações e contratos ainda não aprovados. Esta entrega não implementa o backend
completo de todos os squads, nem integra automaticamente o protótipo frontend.
