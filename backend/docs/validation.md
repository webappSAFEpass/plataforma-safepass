# Validação executada — 27/10/2026

Ambiente: Python 3.12.12; PostgreSQL 16 via Docker Compose, projeto `safepass46`.
Branch ativa: `feature/squad-46`, base `f80d7bb1da467be676783096233d3ebda6edd45f`.

| Verificação | Resultado |
|---|---|
| `uv sync` | Passou |
| `docker compose -p safepass46 up -d --wait db` | PostgreSQL saudável |
| `uv run alembic upgrade head` | Migration `93b27d541c7e` aplicada |
| `uv run alembic check` | Sem diferenças entre models e banco |
| `alembic downgrade base` seguido de `upgrade head` no banco `_test` descartável | Passou |
| `pytest --cov=app --cov-report=term-missing --cov-fail-under=80` | 45 passaram; cobertura 94,23% |
| `pytest tests/unit` separado, sem `TEST_DATABASE_URL` | 30 passaram (subconjunto dos 45) |
| `ruff check .` | Passou |
| `ruff format --check .` | Passou |
| `mypy app` (modo strict) | Passou, 62 arquivos |
| `docker build -t safepass46-backend:local .` | Concluído |
| Container da imagem construída, `DATABASE_URL` apontando para o Postgres do Compose via `host.docker.internal` | Subiu; `GET /health` respondeu `200 {"status":"ok","database":"ok"}` |
| `git diff --check` | Passou |

## O que os testes de integração cobrem

Rodam contra PostgreSQL real com migrations aplicadas (não `create_all`), em
transação externa com savepoint e rollback por teste, inclusive quando o service
comita. Identidade e catálogo de prestadores usam os adapters locais explícitos
(`LocalIdentity`, `LocalProviderCatalog`); isso não valida sessão/JWT do Desafio 1
nem o catálogo real do Desafio 3. Fluxos exercitados: autenticação ausente (401);
dashboard vazio para conta nova; busca de prestadores sem filtro (ordem alfabética)
e com filtro de categoria; favoritar/desfavoritar; avaliação atualizando a média e
creditando pontos; dependente nasce sem permissão de resgate, é bloqueado, é
liberado pelo gestor e então resgata para si mesmo; resgate debita pontos, gera
token, token é usado uma vez e a segunda tentativa falha com 409; saldo
insuficiente não debita nada; cupom fora do plano aparece bloqueado e o resgate é
recusado; cupom do próprio plano libera o resgate; `Idempotency-Key` repetida
devolve o mesmo resgate sem debitar de novo; alerta manual criado e listado.

## O que não foi validado

Não há teste de carga, de concorrência real (duas requisições simultâneas de
resgate — o lock de linha via `SELECT ... FOR UPDATE` cobre isso no código, mas
não foi exercitado com dois processos de fato), nem de expiração de resgate por
tempo real decorrido (os testes de token usam apenas estados já definidos, não
esperam os 7 dias). A rotina de expiração roda sob demanda (ao listar o histórico
ou tentar usar um token), não em um job agendado — não existe scheduler neste
backend. Build e execução do container foram validados neste ambiente; não foram
testados em CI nem publicados em registry algum.

Não houve commits, merges, pushes, PRs ou publicação do ambiente.
