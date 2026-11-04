Pasta para desenvolvimento do frontend

Hoje a pasta tem o chat do assistente SAFEpass (squad 48, Desafio 05) em `src/features/assistant/`. Como rodar: [explicaçãozinha.md](explicaçãozinha.md). Como levar o chat para outro app: [src/features/assistant/README.md](src/features/assistant/README.md).

Área do prestador e da empresa (Desafio 03), portada do protótipo: `src/features/provider-area/` e `src/features/company-area/`, rotas em `/prestador/*` e `/empresa/*`. O chat aparece em todas as telas da área logada (`src/app/(authenticated)/layout.tsx`). Os dados ainda são fictícios (`data.ts` de cada feature), até os endpoints existirem.

```bash
pnpm install
pnpm dev        # http://localhost:3000 → /prestador
pnpm test       # Vitest
```
