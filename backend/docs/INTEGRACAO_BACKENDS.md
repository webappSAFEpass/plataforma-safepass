# Integração dos backends (squads 23, 46 e 47)

Uma aplicação, um PostgreSQL, uma cadeia de migrations. Cada desafio continua dono das
suas tabelas e regras; os pontos de contato são portas explícitas.

## Mapa

```
squad-23 (D01)  users ─ auth ─ plans ─ subscriptions ─ platform_reviews ─ referrals ─ stats
                    │                       │
        AccountIdentity (IdentityGateway)   │ assinatura ativa → plan_id
                    ▼                       ▼
squad-46 (D02)  Principal(user_id, roles, plan_id) → marketplace, reviews, points,
                coupons, dependents, alerts, dashboard
                    ▲
        ProviderCatalog (ProviderCatalogGateway)
                    │
squad-47 (D03)  providers ─ companies
```

## O que foi feito

| Ponto de atrito | Resolução |
|---|---|
| Três scaffolds (`core/`, `shared/`, Alembic, Docker, pyproject) | Um só: base do squad-46/47 + `Settings`, JWT e mixins do squad-23. `uv.lock` regenerado. |
| `DomainError` com duas assinaturas | Aceita as duas: subclasse (`NotFoundError()`) e inline (`DomainError("codigo", "msg", 422)`). Atalhos `missing()`, `forbidden()`, `conflict()`, `unavailable()` mantidos. Formato de erro único `{"error": {"code", "message"}}`. |
| `get_current_user` com dois significados | D01: `get_current_user` → `CurrentUser` (contrato do `CLAUDE.md`). D02/D03: `get_principal` → `Principal`, via `IdentityGateway`. |
| Identidade fictícia dos squads 46/47 | `get_identity` agora devolve `AccountIdentity` (`app/integrations/account_identity.py`): valida o JWT, lê o papel do banco a cada requisição e resolve `plan_id` pela assinatura ativa. `LocalIdentity` só existe em `scripts/dev.py` e nos testes (por `dependency_overrides`). |
| Catálogo de prestadores fictício | `get_provider_catalog` devolve `ProviderCatalog` (`app/modules/providers/catalog.py`), só prestadores **aprovados**. `LocalProviderCatalog` fica apenas nos testes do D02. |
| Migrations com três `down_revision = None` | Cadeia única: `d01_0001` → `93b27d541c7e` (D02) → `66c8e1279f5c` (D03). `alembic upgrade head`, `check` e `downgrade base` verificados. |
| Testes | Raiz usa o banco `*_test` migrado com rollback por teste. Testes do D01 foram para `tests/integration/accounts/` (e ganharam um teste ponta a ponta entre os três desafios). |

## Decisões a confirmar com os squads

1. **Faixa de preço (`baixo`/`medio`/`alto`)**: o D03 guarda preços, o D02 filtra por faixa.
   O catálogo calcula a média dos serviços ativos (preço fixo, ou ponto médio da faixa)
   com cortes em R$ 150 e R$ 400 (`PRICE_TIER_*` em `providers/repository.py`).
   Prestador sem serviço com preço fica com `price_tier = null` (por isso o campo
   passou a ser opcional em `ProviderSummary` e `ProviderCardOut`).
2. **Categoria do prestador**: o D03 liga categorias a serviços; o card mostra a primeira
   categoria (ordem alfabética) entre os serviços ativos, ou `Sem categoria`.
3. **Sem FKs entre desafios**: `user_id`/`provider_id`/`plan_id` nos módulos D02/D03 são
   UUIDs sem chave estrangeira para `users`, `providers` ou `plans`, para que os
   adapters locais de teste continuem funcionando. Candidatos a FK numa migration futura.
4. **Papel `dependent`**: o D01 aceita o papel, mas o cadastro público não cria
   dependentes; o vínculo `Dependent.linked_user_id` (D02) ainda precisa de um fluxo que
   crie o usuário.
5. **Multiplicador de pontos do plano** (`plans.points_multiplier`, D01) ainda não é
   aplicado pelo `points` (D02); a recompensa de avaliação segue fixa.
6. **Cupons por plano**: `coupons.plan_ids` guarda ids de `plans` reais; falta o endpoint
   administrativo para cadastrar cupons/campanhas.
7. **Tests do D01** tinham `_register()` sem `client` (nunca rodavam sem banco); corrigido.

## Como rodar

```bash
cd backend
uv sync
docker compose -p safepass up -d --wait db     # Postgres em 127.0.0.1:55432
uv run alembic upgrade head
uv run python -m scripts.seed                   # planos e admin inicial
uv run fastapi dev app/main.py
```

Stack completa (site + API + Mailpit): `docker compose up --build` na raiz.
