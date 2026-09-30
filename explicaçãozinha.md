## Como abrir

O chat conversa com o backend SAFEpass (FastAPI, repositório `safepass-backend`). Suba o backend antes:

```bash
cd ../safepass-backend && make run      # http://localhost:8000/v1
```

Depois, neste projeto:

```bash
cp .env.example .env.local   # BACKEND_API_URL, BACKEND_API_TOKEN (o mesmo token de SERVICE_TOKENS do backend), SESSION_USER_ID
npm install
npm run dev
```

Abra **http://localhost:3000** no navegador (use `localhost`, não o IP de rede que também aparece no terminal).

- `?foraDoHorario` na URL simula o atendimento humano fora do horário (mostra o formulário de recado).
- `?dentroDoHorario` simula o expediente (seg–sex, 8h–18h) a qualquer hora: mostra o botão "Falar no WhatsApp".
- Os segredos ficam só no servidor do Next (`app/api/*`); nada com `NEXT_PUBLIC_`.
- Em produção (`next start`), as rotas só funcionam com `ALLOW_SHARED_DEMO_USER=true`, porque o protótipo usa um único usuário para todos os visitantes. Use só em demo local.
