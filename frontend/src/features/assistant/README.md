# Módulo do assistente SAFEpass

Tudo o que o chat precisa fica nesta pasta: componentes, estilos com escopo, cliente do SSE, contratos gerados do backend e os handlers das rotas de servidor. Para levar o chat para outro projeto Next.js (App Router), basta copiar a pasta e criar cinco arquivos de rota.

```
features/assistant/
  index.ts                 entrada pública: export { ChatWidget }
  components/              ChatWidget (raiz), cabeçalho, formulário, conversa, cards, ícones
  assistant.module.css    estilos com escopo (CSS Module); tokens na .root, não em :root
  cx.ts                    cx("icon-btn", "header-btn"): classes do CSS Module pelo nome
  lib/chat.ts              cliente: leitura do SSE, POST/GET, mensagens de erro
  lib/contracts.ts         apelidos dos tipos gerados (não edite à mão)
  lib/api.gen.ts           gerado do openapi.json do backend (pnpm api:assistant-types)
  server/handlers.ts       handlers de /api/chat, /api/lead, /api/recado, /api/consent, /api/atendimento
  server/backend.ts        acesso ao backend com o token (server-only)
  server/protect.ts        mesma origem + rate limit por IP
```

## Levar para outro projeto

1. Copie `features/assistant/` para o projeto de destino.
2. Instale as dependências: `pnpm add server-only` e, para regenerar contratos, `pnpm add -D openapi-typescript`.
3. Crie as rotas. Cada uma só reexporta o handler, e o caminho do import segue o alias do projeto:

   ```ts
   // app/api/chat/route.ts — a configuração precisa ficar no próprio route.ts
   export const runtime = "nodejs";
   export const dynamic = "force-dynamic";
   export const maxDuration = 120;
   export { chatPOST as POST } from "@/features/assistant/server/handlers";

   // app/api/lead/route.ts
   export { leadPOST as POST } from "@/features/assistant/server/handlers";

   // app/api/recado/route.ts
   export { recadoPOST as POST } from "@/features/assistant/server/handlers";

   // app/api/consent/route.ts
   export { consentPOST as POST } from "@/features/assistant/server/handlers";

   // app/api/atendimento/route.ts
   export const dynamic = "force-dynamic";
   export { atendimentoGET as GET } from "@/features/assistant/server/handlers";
   ```

   Se as rotas precisarem de outro prefixo (ex.: `/api/assistant/chat`), mude também as URLs em `lib/chat.ts` e `components/ChatWidget.tsx`.

4. Coloque o widget em qualquer página ou layout: `import { ChatWidget } from "@/features/assistant"` e depois `<ChatWidget />`.
5. Configure as variáveis, só no servidor (nunca com `NEXT_PUBLIC_`):

   | Variável                 | O que é                                                                                                          |
   | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
   | `BACKEND_API_URL`        | Base do backend, com `/v1`. Ex.: `https://api.exemplo.com/v1`                                                    |
   | `BACKEND_API_TOKEN`      | Token de serviço do backend (`SERVICE_TOKENS` de lá)                                                             |
   | `SESSION_USER_ID`        | Usuário fixo do protótipo. Ao integrar o login, troque `sessionUserId()` em `server/backend.ts` pela sessão real |
   | `ALLOW_SHARED_DEMO_USER` | `true` libera o usuário fixo em produção. Use só em demo                                                         |

Os imports internos são relativos, então o módulo não depende do alias `@/` do projeto. Só os arquivos de rota usam o alias.

## Estilos

Os estilos são um CSS Module: as classes recebem nomes únicos no build. Assim, um `.btn-primary` ou `.field` do site não afeta o chat, e o chat não afeta o site. As variáveis de cor ficam na `.root` do widget, então não sobrescrevem as do site. A paleta e as fontes seguem o layout da área logada: Inter e Sora vêm das variáveis `--font-inter` e `--font-sora` do layout raiz, com fallback para a fonte do sistema.

Use as classes sempre por `cx("nome-da-classe")`. Em desenvolvimento, um nome que não existe no CSS quebra na hora, em vez de sumir o estilo em silêncio.

## Contratos com o backend

`lib/api.gen.ts` é gerado do `openapi.json` do backend. Quando a API mudar:

```bash
# no backend
make openapi
# aqui (o caminho do openapi.json está no script "api:assistant-types" do package.json)
pnpm api:assistant-types
pnpm typecheck   # aponta o que quebrou no front
```

O `/chat/stream` é SSE, que o OpenAPI não descreve. Os eventos são `token` `{text}`, `reset` `{}`, `card` (Card), `done` (ChatResponse) e `error` `{error}`. Quem os lê é `streamChat` em `lib/chat.ts`.

## Regras de negócio

O módulo não guarda regra de negócio. O horário do atendimento humano vem de `GET /api/atendimento`, que lê as regras da PO no backend (`regras/regras-negocio.json`). O pedido de consentimento, o aviso de fora do horário e o "não consegui responder" chegam prontos nos cards e respostas do backend. No front ficam só textos de interface, como rótulos, botões e mensagens de erro de rede.
