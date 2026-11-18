# Validação executada — 20/10/2026

Ambiente: Python 3.12.14; PostgreSQL 16 via Docker Compose, projeto `safepass47`.
Branch ativa: `feature/squad-47`, base `53932c848efa83f7e68dddae4202793eaeeaf4e4`.

| Verificação | Resultado |
|---|---|
| `uv sync --frozen` repetido | Passou |
| `docker compose -p safepass47 up -d --wait db` | PostgreSQL saudável |
| `alembic upgrade head` | Migration `66c8e1279f5c` aplicada |
| `alembic check` | Sem diferenças entre models e banco |
| Downgrade a base e upgrade em banco `_test` descartável | Passou |
| `pytest --cov=app --cov-report=term --cov-fail-under=80` | 32 passaram; cobertura 99,02% |
| `pytest tests/unit` separado, sem variável de banco | 8 passaram (subconjunto dos 32) |
| `ruff check .` | Passou |
| `ruff format --check .` | Passou; CLAUDE.md preservado/excluído do formatador |
| `mypy app` | Passou, 31 arquivos |
| HTTP real `/health` | 200; conexão PostgreSQL confirmada |
| HTTP real: cadastro e consulta | Registro persistido e consultado |
| Duas aprovações HTTP concorrentes | Uma 200, outra 409 |
| Reinício da aplicação seguido de leitura HTTP | Mesmo registro aprovado recuperado |
| Diff do frontend e backend/CLAUDE.md | Nenhuma alteração |
| `git diff --check` | Passou |

Os testes de integração usam PostgreSQL e migrations reais. Identidade foi
substituída por adapter local explícito: isso não valida sessão/JWT do Squad 1.
Cobertura é de linhas, não certificação de segurança ou integração inter-squads.

Build da imagem da API: não concluído. O builder não resolve os destinos de
download; tentativa com rede host e depois proxy/bundle de confiança continuou
falhando por DNS. Nenhuma verificação TLS/checksum foi desativada. O Dockerfile
foi preparado, mas não deve ser descrito como imagem construída/testada.
PostgreSQL via Docker e API via uv foram efetivamente executados.

Não foram executados testes de cupons, avaliações, IA ou documentos reais porque
existem apenas ports e adapters indisponíveis; não há implementação desses módulos.
O teste de aprovação concorrente não demonstra consumo concorrente de token.

Não houve commits, merges, pushes, PRs ou publicação do ambiente.
