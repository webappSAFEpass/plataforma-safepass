# Decisões da primeira implementação — Squad 46

## Referência e escopo

Referência lida integralmente: `backend/Partial Delivery Squad 46.pdf`, Desafio 02.
Implementa os módulos que `backend/CLAUDE.md` atribui ao Desafio 02: `marketplace`,
`reviews`, `points`, `coupons`, `dependents` e `dashboard`, mais `alerts` (US03 do
documento; `CLAUDE.md` não nomeia um módulo próprio para alertas/agenda, mas o
próprio `CLAUDE.md` exige que o dashboard não contenha regra de negócio, então
alertas e agenda viraram um módulo próprio chamado por ele). Por instrução
explícita, toda a parte de IA (E8, US15, US16, módulo `ia/`, embeddings, resumo e
moderação automática) foi deixada de fora; `CLAUDE.md` já descrevia `reviews` sem
moderação por IA, então as duas fontes concordam.

`CLAUDE.md` é a convenção acordada entre os cinco squads e tem precedência sobre o
PDF onde os dois divergem (por exemplo, o PDF propõe moderação de avaliação por IA
no modelo de dados; `CLAUDE.md` não inclui isso na responsabilidade de `reviews`).

## Padrão seguido (branch `feature/squad-47`)

A branch `feature/squad-47` (Desafio 03, módulos `providers`/`companies`) já tinha
montado toda a infraestrutura compartilhada — não específica de prestadores — então
`core/`, `shared/`, o par `IdentityGateway`/`UnconfiguredIdentity`/adapter local,
`pyproject.toml`, Alembic, Docker Compose e o estilo de testes foram replicados
quase literalmente daquela branch, para as duas branches convergirem no mesmo
padrão quando forem integradas. `providers`/`companies` em si **não** foram
copiados nem mergeados; squad-47 ainda não está em `main`/`develop`.

## Integrações com desafios ainda não prontos

Nem auth (Desafio 1) nem prestadores (Desafio 3) estão mergeados em `main`. Seguindo
`CLAUDE.md` ("criar um Protocol + implementação fake/mock... trocar pela
implementação real quando pronta"):

- `app/integrations/identity.py` + `local_identity.py`: mesmo formato do squad-47
  (`IdentityGateway`, `Principal`, `UnconfiguredIdentity` falha com 503;
  `LocalIdentity` só em `scripts/dev.py` e testes). Acrescentei `Principal.plan_id`
  (ausente no squad-47, que não precisava de plano) porque o bloqueio de cupom por
  plano é regra deste desafio; `None` é tratado como "plano desconhecido" e cupons
  com `plan_ids` não vazio ficam bloqueados por padrão (falha fechada).
- `app/integrations/provider_catalog.py` + `local_provider_catalog.py`: o mesmo
  padrão para o catálogo de prestadores. `marketplace` e `reviews` nunca criam uma
  tabela `providers` própria; `UnconfiguredProviderCatalog` falha com 503 em
  produção, e um catálogo fixo em memória (3 prestadores) existe só para
  desenvolvimento/testes. Troca pela integração real quando o módulo do squad-47
  for mergeado.

## Onde mora a "conta gestora"

O modelo do PDF tem uma entidade `conta_gestora` (saldo de pontos, plano) da qual
dependentes e resgates dependem, mas `CLAUDE.md` não lista um módulo "accounts"
separado. Como o dado central dessa entidade é o saldo, ela virou `ManagerAccount`
dentro de `points`; `dependents` e `coupons` referenciam `account_id` por FK e
chamam `PointsService` para resolvê-la. Não existe endpoint de criação de conta
(Desafio 1 possui o cadastro, não este backend): a conta é provisionada de forma
preguiçosa no primeiro acesso autenticado que precise dela, e essa criação comita
sozinha (não há nada maior para fazer parte da mesma transação na primeira vez).

## Regras implementadas com interpretação própria

- **Idempotência do resgate**: o PDF cita "chave de idempotência" mas o exemplo de
  payload não mostra nenhuma. Implementei como um header HTTP opcional
  `Idempotency-Key` (UUID); com ele, uma constraint única em
  `(account_id, idempotency_key)` faz uma repetição devolver o resgate já criado em
  vez de debitar de novo. Sem o header, não há proteção além do lock de linha da
  conta durante o débito.
- **Recompensa por avaliação válida**: o PDF não fixa valor. Usei
  `REVIEW_REWARD_POINTS = 10` como proposta, só para a conta gestora (quando quem
  avalia é um dependente, nada é creditado — o dependente não tem conta de pontos
  própria e o documento não autoriza creditar a conta de outra pessoa por uma ação
  do dependente).
- **Remoção de dependente**: implementada como exclusão lógica (`active = false`),
  não `DELETE` físico, pelo mesmo motivo do squad-47 para vínculos — preserva o
  histórico de resgates que referenciam o dependente como beneficiário.
- **Uso do token de resgate** (`POST /resgates/{token}/utilizacao`): qualquer
  portador autenticado do token pode marcá-lo como usado; não há verificação de
  posse além do token em si, porque ainda não existe identidade de prestador neste
  sistema (igual a um voucher físico: quem tem o código, usa).
- **Alerta de "limite"**: só o alerta de vencimento de cupom foi implementado. O
  alerta de limite do plano depende de dados de uso/limite que pertencem ao
  Desafio 1 e não estão disponíveis.

## Entidades não expostas por falta de endpoint no PDF

O PDF não lista `POST /cupons` nem rota alguma para `resposta_prestador` em
avaliações. As colunas (`coupons`, `reviews.provider_response`) existem porque
fazem parte do modelo de dados acordado, mas não há rota pública para escrevê-las
ainda — cupons são semeados diretamente (testes/migração) até alguém definir quem
administra o catálogo, e resposta do prestador espera a identidade do prestador
existir.

## Esquema sem FK circular

`point_transactions.redemption_id` é um UUID indexado, não uma FK — a FK inversa
(`redemptions.account_id → manager_accounts.id`) já existe, e uma segunda em
sentido contrário criaria um ciclo entre as migrações de `points` e `coupons`.

## Pendências para integração oficial

1. Adapter real de identidade (Desafio 1), incluindo papéis de dependente e dados
   de plano em `Principal`.
2. Adapter real de catálogo de prestadores (Desafio 3), substituindo
   `LocalProviderCatalog`/`UnconfiguredProviderCatalog`.
3. Definir quem administra o catálogo de cupons (papel, endpoint de criação).
4. Job periódico para expirar resgates vencidos sem depender de uma leitura
   recente (hoje a expiração roda sob demanda em `GET /resgates` e
   `POST /resgates/{token}/utilizacao`).
5. Conectar `Principal.plan_id` a dados reais de plano assim que o Desafio 1
   expuser isso.

Não foram feitos commits, merges, pushes ou PRs.
