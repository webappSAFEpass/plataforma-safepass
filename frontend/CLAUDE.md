# CLAUDE.md — Frontend SAFEpass

Aplicação web da plataforma SAFEpass (gestão integrada de benefícios em saúde e bem-estar), desenvolvida por 5 squads da Residência Tecnológica UCB × Porto Digital. Consome a API FastAPI em `../backend` e deve ser **responsiva** (mobile-first), acessível e rápida.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript** em modo `strict`
- **Tailwind CSS** + **shadcn/ui** (componentes base em `src/components/ui`)
- **TanStack Query** para estado de servidor no cliente
- **React Hook Form** + **Zod** para formulários e validação
- **openapi-typescript** para gerar os tipos da API a partir do OpenAPI do backend
- **pnpm** como gerenciador de pacotes
- **ESLint** + **Prettier**; **Vitest** + **React Testing Library** + **MSW** para testes
- **Docker** para execução local e deploy; **GitHub Actions** para CI/CD

## Comandos

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build && pnpm start
pnpm lint                # ESLint
pnpm format:check        # Prettier
pnpm typecheck           # tsc --noEmit
pnpm test                # Vitest (modo run)
pnpm test:watch
pnpm test:coverage
pnpm api:types           # regenera src/lib/api/schema.d.ts a partir de $API_URL/openapi.json
docker compose up --build   # (na raiz do repo) sobe db + backend + frontend
```

Antes de considerar uma tarefa concluída: `lint`, `typecheck`, `test` e `build` devem passar — são os mesmos passos do CI.

## Estrutura

Organização **por feature**: tudo de um domínio fica junto; `app/` só compõe páginas.

```
frontend/
├── src/
│   ├── app/                          # rotas (App Router) — apenas composição
│   │   ├── (public)/                 # landing, login, cadastro
│   │   ├── (authenticated)/          # área logada
│   │   │   ├── layout.tsx            # sidebar + header
│   │   │   ├── painel/               # Meu Painel de Controle
│   │   │   ├── prestadores/          # Meus Prestadores (marketplace) e [id]/ perfil
│   │   │   ├── pontos-e-cupons/      # Meus Pontos e Cupons
│   │   │   ├── dependentes/          # Meus Dependentes
│   │   │   └── documentos/           # Meus Documentos
│   │   ├── layout.tsx
│   │   └── not-found.tsx / error.tsx
│   ├── features/
│   │   └── <feature>/                # dashboard, marketplace, reviews, points, coupons, dependents, documents, auth...
│   │       ├── components/           # componentes da feature
│   │       ├── hooks/                # useProviders, useRedeemCoupon...
│   │       ├── api.ts                # chamadas HTTP da feature (usa lib/api/client)
│   │       ├── schemas.ts            # schemas Zod (formulários)
│   │       ├── types.ts              # tipos derivados do schema da API
│   │       └── __tests__/
│   ├── components/
│   │   ├── ui/                       # primitivos shadcn/ui (Button, Card, Dialog...) — sem regra de negócio
│   │   └── layout/                   # Sidebar, Header, PageTitle
│   ├── lib/
│   │   ├── api/client.ts             # fetch wrapper: baseURL, auth, tratamento de erro
│   │   ├── api/schema.d.ts           # GERADO — não editar à mão
│   │   ├── env.ts                    # variáveis de ambiente validadas com Zod
│   │   └── utils.ts                  # cn(), formatadores de data/moeda
│   ├── mocks/                        # handlers MSW (testes e desenvolvimento sem backend)
│   └── middleware.ts                 # protege rotas de (authenticated)
├── tests/setup.ts
├── Dockerfile
└── .env.example
```

Rotas (URLs) em português, pois são visíveis ao usuário; código (componentes, funções, pastas de `features/`) em inglês.

## Regras de arquitetura

- **Server Components por padrão.** Usar `"use client"` só quando houver estado, efeitos, eventos ou APIs do browser — e o mais baixo possível na árvore.
- **Páginas são finas**: `page.tsx` busca dados/compõe componentes da feature; lógica fica em `features/`.
- **Nenhum `fetch` solto em componentes.** Toda chamada HTTP passa por `features/<feature>/api.ts`, que usa `lib/api/client.ts`. No cliente, consumir via hooks do TanStack Query (`useQuery`/`useMutation`) definidos em `hooks/`.
- **Tipos da API vêm do OpenAPI gerado** (`schema.d.ts`). Não redeclarar manualmente formatos de resposta do backend. Mudou o contrato → rodar `pnpm api:types`.
- Uma feature pode importar de `components/`, `lib/` e de outra feature apenas pelo que ela exporta publicamente; nunca importar de `app/`.
- `components/ui` não conhece domínio: nada de chamadas à API ou regras de negócio ali.
- Estado: servidor → TanStack Query; formulário → React Hook Form; UI local → `useState`; URL (filtros, busca, página, ordenação do marketplace) → search params. Não adicionar biblioteca de estado global sem necessidade real.
- Enquanto um endpoint de outro squad não existe, usar handlers **MSW** em `src/mocks/` seguindo o contrato combinado. Trocar para a API real sem mudar os componentes.

## Requisitos de UX do Desafio 02

- Sidebar da área logada: Meu Painel de Controle, Meus Prestadores, Meus Pontos e Cupons, Meus Dependentes, Meus Documentos.
- **Painel**: identificação do usuário, resumo do plano, indicadores de uso dos limites, saldo de pontos, resumo dos dependentes, alertas (limite e vencimento), agenda dos próximos 7 dias e cupons ativos.
- **Marketplace**: busca e filtros (prestador, categoria, faixa de preço, tags), ordenação e paginação refletidos na URL; sem filtros, lista completa em ordem alfabética. Card com imagem, nome, categoria, avaliação, tags, contato e link para o perfil; favoritar e avaliar.
- **Cupons**: disponíveis aparecem normalmente; **bloqueados pelo plano** são visualmente diferenciados e levam ao upgrade. Após resgate, exibir token e validade (7 dias). Histórico com filtros.
- **Dependentes**: pessoas e pets; o gestor define permissão de resgate por dependente. A UI esconde/desabilita ações não permitidas, mas **a autorização real é sempre do backend**.
- Todo carregamento tem estado de **loading** (skeleton), **vazio** e **erro** tratados (`loading.tsx`, `error.tsx` ou estados do Query).

## Autenticação e segurança

- Token de sessão em **cookie httpOnly** (definido pelo backend / Desafio 01) — nunca em `localStorage`.
- `middleware.ts` redireciona usuários não autenticados de `(authenticated)` para o login.
- Variáveis de ambiente validadas em `lib/env.ts`. Só prefixar com `NEXT_PUBLIC_` o que pode ser público; segredos nunca vão para o cliente. `.env` não é commitado; manter `.env.example`.
- Não exibir nem logar dados sensíveis de saúde além do necessário (LGPD). Sem `dangerouslySetInnerHTML` com conteúdo do usuário.

## Código limpo

- TypeScript `strict`; **proibido `any`** (usar `unknown` + narrowing). Props sempre tipadas.
- Componentes pequenos e com uma responsabilidade; se passar de ~150 linhas ou misturar busca de dados com muita UI, dividir.
- Nomes: componentes `PascalCase` (`ProviderCard.tsx`), hooks `useCamelCase`, demais arquivos `kebab-case` ou `camelCase` consistente dentro da feature. Um componente exportado por arquivo.
- Sem números/strings mágicas: constantes nomeadas (`COUPON_VALIDITY_DAYS`, `DEFAULT_PAGE_SIZE`).
- Estilo apenas com Tailwind (use `cn()` para classes condicionais); sem CSS inline. Cores e espaçamentos via tokens do tema (identidade visual SAFEpass).
- **Acessibilidade**: HTML semântico, `label` em todo input, `alt` em imagens, foco visível, navegação por teclado, contraste adequado.
- Imagens com `next/image`; links internos com `next/link`.
- Textos de interface em **português (pt-BR)**; datas e moeda formatadas com `Intl` em `pt-BR`.
- Não criar abstrações antecipadas; duplicação pequena é melhor que abstração errada.

## Testes

- **Vitest + React Testing Library** para componentes e hooks; **MSW** para simular a API (nunca mockar `fetch` na mão).
- Testar comportamento visível ao usuário: consultar por papel/texto (`getByRole`, `getByLabelText`), interagir com `user-event`. Não testar detalhes de implementação.
- Prioridades: lógica pura em `utils`/hooks (ex.: estado do cupom, cálculo de validade), formulários (validação Zod), fluxos críticos (filtro do marketplace, resgate de cupom, cupom bloqueado, permissão de dependente) e estados de loading/vazio/erro.
- Arquivos `*.test.ts(x)` em `__tests__/` da feature. Padrão AAA; nome descreve o comportamento: `it("exibe cupom bloqueado com CTA de upgrade quando o plano não permite")`.
- Cobertura mínima de **70%** em `src/features` e `src/lib` (o CI falha abaixo disso). Bug corrigido ganha teste de regressão.

## Docker

- `next.config.ts` com `output: "standalone"`.
- `Dockerfile` multi-stage: `deps` (pnpm install --frozen-lockfile) → `build` (pnpm build) → `runner` (`node:<lts>-alpine`, copia `.next/standalone`, `.next/static` e `public`).
- Rodar como usuário não-root, expor `3000`, `NODE_ENV=production`.
- `.dockerignore` exclui `node_modules`, `.next`, `.env*`, `coverage`.
- A URL da API é configurada por variável de ambiente, nunca hardcoded.

## CI/CD (GitHub Actions)

Workflow `.github/workflows/frontend.yml` na raiz do repositório, disparado apenas por mudanças em `frontend/**`:

1. **lint** — `pnpm lint` e `pnpm format:check`
2. **typecheck** — `pnpm typecheck`
3. **test** — `pnpm test:coverage`
4. **build** — `pnpm build` e `docker build` da imagem
5. **deploy** (apenas push na `main`) — publica a imagem no GHCR com tag do SHA e `latest`, e dispara o deploy do ambiente

Usar cache do pnpm (`actions/setup-node` com `cache: pnpm`). Pull requests só são mergeados com o CI verde e ao menos uma revisão.

## Git

- Branches: `feat/<feature>-<descricao>`, `fix/...`, `chore/...`. Nunca commitar direto na `main`.
- Commits no padrão **Conventional Commits**: `feat(marketplace): adiciona filtro por faixa de preço`.
- PRs pequenos, com descrição, screenshots (desktop e mobile) para mudanças visuais e instruções de teste.
