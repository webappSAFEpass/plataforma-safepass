# Contrato de integração — Desafio 01

Tudo sob `/api/v1`. OpenAPI em `/openapi.json` é a fonte da verdade (o front gera tipos dele).
Erros: `{"error": {"code": "...", "message": "...", "details": [...]}}`.

## 1. Identidade (usada por todos os squads)

```python
from app.core.dependencies import get_current_user, get_optional_user, require_role
from app.shared.identity import CurrentUser   # id, role, email, full_name
from app.shared.roles import Role             # USER, DEPENDENT, PROVIDER, COMPANY, ADMIN

@router.get("/algo")
def algo(user: CurrentUser = Depends(get_current_user)): ...

@router.post("/outra", dependencies=[Depends(require_role(Role.PROVIDER))]): ...
```

- Sessão por cookie `access_token` (httpOnly) **ou** `Authorization: Bearer <jwt>` (útil em testes/Swagger).
- O papel vem do banco a cada requisição. **Posse do recurso** (ex.: dependente só vê o que é seu) é validada no service de cada módulo.
- Dependentes (D02): papel `dependent` já existe; criar a conta/vínculo é responsabilidade do D02.

## 2. Planos e assinatura (limites parametrizados)

```python
from app.modules.subscriptions.dependencies import get_subscription_service

sub = service.get_current(user.id)  # Subscription | None
sub.plan.tier  # 0 free, 1 aura, 2 aura_plus  -> elegibilidade de cupons
sub.plan.max_dependents  # None = ilimitado
sub.plan.monthly_review_limit
sub.plan.points_multiplier  # x1, x2, x3
```

`GET /plans` (público) lista os planos. Todo cadastro de `user` recebe o plano Free automaticamente.
Valores moram na tabela `plans` (seed em `app/modules/plans/seed.py`): mudar regra = mudar dado, sem deploy.

## 3. Endpoints do D01

| Método | Rota | Acesso |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | público / sessão |
| GET | `/auth/me` | logado (usuário + plano) |
| POST | `/auth/forgot-password`, `/auth/reset-password` | público |
| GET | `/plans` | público |
| GET/PATCH | `/admin/plans[/{code}]` | `admin` |
| POST | `/subscriptions` | `user` |
| GET | `/stats/public` | público |
| GET | `/admin/dashboard` | `admin` |
| POST | `/platform-reviews` · GET `/platform-reviews/featured` | público |
| GET/POST/PATCH | `/admin/platform-reviews[/{id}/reply]` | `admin` |
| POST | `/referrals` | público / sessão opcional |
| GET/PATCH | `/admin/referrals[/{id}]` | `admin` |

## 4. Pontos de atrito a combinar entre squads (decidir ANTES do merge)

1. **`users`**: o D01 define `User` (id, email, password_hash, full_name, role, is_active). Se o D02 já criou um model/tabela `users`, precisamos ficar com **uma** só.
2. **`get_current_user` / `CurrentUser` / `Role`**: se o D02 criou versões próprias (sessão simulada), trocar pelas do D01 (mesmos nomes, assinatura compatível com o exemplo do `CLAUDE.md`).
3. **Cupons, pontos e campanhas**: o `CLAUDE.md` coloca `coupons` e `points` no D02. Para evitar duas fontes de verdade, o D02 deve ser dono das tabelas e das regras; a tela administrativa de cupons/campanhas deve consumir os services/endpoints públicos desse módulo após o contrato ser combinado. Este pacote D01 não cria tabelas duplicadas para esses domínios.
4. **Avaliações**: `platform_reviews` (avaliação da *plataforma*, rodapé do site) é do D01. `reviews` (avaliação de *prestador*) é do D02. Tabelas separadas de propósito.
5. **Perfis e parcerias**: o `CLAUDE.md` atribui `providers/companies` ao D03. O D01 guarda a identidade (`users`) e os papéis; detalhes de prestadores/empresas e suas parcerias devem vir dos services do domínio responsável, sem criar tabelas concorrentes.
6. **Alembic**: duas migrations iniciais geram dois *heads*. Ajustar `down_revision` de `d01_0001` para a última migration existente e registrar os models em `app/core/models_registry.py`.
7. **Métricas da landing**: `StatsService` usa o Protocol `BenefitsMetrics` (benefícios resgatados e economia). O D02 pode implementá-lo; hoje retorna 0.

## 5. Gateway de pagamento
Interface `PaymentGateway` em `subscriptions/gateway.py`. Hoje só existe o adaptador `simulated` (ativa na hora, sem cobrança).
Quando o gateway for escolhido: novo adaptador + endpoint de webhook com validação de assinatura/token e idempotência por ID de evento.


## Novos recursos administrativos deste pacote

- `GET /api/v1/admin/dashboard`: totais agregados de usuários, prestadores, empresas, assinaturas, avaliações e indicações. Responde apenas a `admin`. As métricas de benefícios/economia continuam no contrato `BenefitsMetrics` do D02.
- `GET /api/v1/admin/plans`: todos os planos para manutenção administrativa.
- `PATCH /api/v1/admin/plans/{code}`: atualiza nome, preço, limites, multiplicador, destaques, benefícios e status ativo. `code` e `tier` permanecem estáveis para não quebrar integrações com elegibilidade por plano.
- `PATCH /api/v1/admin/referrals/{id}`: atualiza status para `new`, `contacted`, `registered` ou `rejected`.

Essas rotas seguem o mesmo contrato de erros, identidade compartilhada e autorização `require_role(Role.ADMIN)`. Não foi incluído assistente de IA no site ou no backend deste pacote.
