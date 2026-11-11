# SAFEpass — Desafio 01

Aplicação web do SAFEpass, organizada como monorepo para facilitar a integração entre squads:

- `frontend/`: Next.js + React + TypeScript.
- `backend/`: FastAPI + SQLAlchemy + Alembic.
- PostgreSQL 16 como banco compartilhado.

**O assistente de IA não faz parte desta entrega.** O backend mantém contratos de identidade, autenticação e módulos do Desafio 01 para que os outros desafios possam integrar seus serviços sem acessar diretamente o banco por fora da API.

## Executar com Docker

Requisitos: Docker Desktop com Docker Compose.

```bash
docker compose up --build
```

URLs locais:

| Serviço | URL |
| --- | --- |
| Site Next.js | http://localhost:3000 |
| API / Swagger | http://localhost:8000/docs |
| E-mails de desenvolvimento (Mailpit) | http://localhost:8025 |
| PostgreSQL | localhost:5432 |

Conta administrativa apenas para desenvolvimento: `admin@example.com` / `Admin12345`. Troque essas credenciais em qualquer ambiente compartilhado e nunca as use em produção.

Para encerrar: `Ctrl+C`; para remover também o banco local: `docker compose down -v` (isso apaga os dados do volume).

## Executar sem Docker

Requisitos: Node.js 22, pnpm, Python 3.12, uv e PostgreSQL 16.

1. Crie o banco `safepass` no PostgreSQL.
2. Em `backend/`, copie `.env.example` para `.env` e configure `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` e SMTP.
3. Execute:

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed
uv run fastapi dev app/main.py
```

4. Em outro terminal, em `frontend/`:

```bash
pnpm install
pnpm dev
```

O site fica em `http://localhost:3000`. A API fica em `http://localhost:8000/docs`. Para recuperar senha em desenvolvimento, configure Mailpit ou outro servidor SMTP.

## O que está implementado neste Desafio 01

- Landing responsiva alinhada à paleta do manual de marca.
- Cadastro de usuário, prestador e empresa; login, logout e renovação de sessão.
- Senhas com Argon2id, access token JWT, refresh token rotativo armazenado como hash e cookies `httpOnly`.
- Recuperação de senha por e-mail, com resposta que não revela se um endereço está cadastrado.
- Planos lidos do banco, assinatura de demonstração identificada explicitamente como simulada e aceite dos termos.
- Avaliação pública da plataforma, moderação, filtro por estrelas, resposta administrativa e controle de publicação na landing.
- Indicação de profissionais e acompanhamento de status no painel admin.
- Dashboard administrativo com indicadores, edição dos planos, página de FAQ e página de Termos de Uso.
- Contrato OpenAPI em `/openapi.json` e rotas sob `/api/v1` para integração entre squads.

## Limites conhecidos e integração

- **Pagamento real:** o gateway está deliberadamente simulado até a equipe definir um provedor e fornecer credenciais/webhook. Nenhuma cobrança real é feita.
- **Pontos, cupons, campanhas e dependentes:** pertencem ao domínio do Desafio 02. Este projeto não cria tabelas duplicadas; a integração deve chamar os services/endpoints desse módulo.
- **Perfis completos de prestadores e empresas:** pertencem ao Desafio 03. O Desafio 01 mantém a identidade (`users`) e os papéis compartilhados.
- **Benefícios e economia na faixa pública:** retornam zero enquanto o Desafio 02 não conectar sua implementação ao contrato `BenefitsMetrics`.
- **Termos de Uso:** a página é uma minuta de protótipo e precisa de revisão jurídica antes de uso público.
- O logotipo exibido é uma composição vetorial simplificada com o nome e o escudo; substitua pelo SVG oficial final quando a equipe disponibilizar um arquivo de marca aprovado.

## Integração com outros squads

Leia `backend/docs/INTEGRACAO.md` antes de mesclar módulos. A fonte da verdade dos endpoints é o OpenAPI. Todos os squads devem compartilhar uma única tabela `users`, os mesmos tipos `CurrentUser`/`Role` e uma única cadeia de migrations Alembic. Não duplique tabelas de `coupons`, `points`, `providers`, `companies`, avaliações de prestadores ou dependentes.

Para gerar tipos TypeScript da API, com o backend em execução:

```bash
cd frontend
pnpm api:types
```

## Testes

```bash
cd backend
uv run pytest tests/unit
uv run pytest                         # inclui testes de integração quando PostgreSQL de teste estiver disponível
```

O projeto foi ajustado para ser executado por Docker Compose, mas o ambiente de montagem deste arquivo não tinha acesso ao registro de pacotes; por isso, valide `docker compose up --build`, build do Next e migrações na máquina com Docker/rede antes da apresentação.
