-- SAFEpass — tabelas do assistente (Desafio 05) sobre o banco do squad no Supabase.
-- Idempotente. NÃO altera a estrutura das tabelas existentes (usuario, dependente, pet, planos,
-- prestador, empresa); só liga RLS nelas.
-- RLS ligado sem policies: a API pública do Supabase (anon/authenticated) não lê nada;
-- só o backend, conectado como postgres, acessa os dados.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Documentos fictícios (dependência do Desafio 04), por titular: usuário, dependente ou pet.
create table if not exists documento (
  id serial primary key,
  usuario_id integer not null references usuario(id) on delete cascade,
  titular_tipo text not null check (titular_tipo in ('usuario', 'dependente', 'pet')),
  titular_id integer not null,
  tipo text not null,
  validade date,
  observacao text
);
create index if not exists idx_documento_usuario on documento(usuario_id);

create table if not exists lead (
  id uuid primary key default gen_random_uuid(),
  usuario_id integer references usuario(id) on delete set null,
  nome text not null,
  telefone text not null,
  mensagem_inicial text not null,
  created_at timestamptz not null default now()
);

create table if not exists conversa (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references lead(id) on delete cascade,
  usuario_id integer references usuario(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_conversa_lead on conversa(lead_id);

create table if not exists mensagem (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversa(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  intent text,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_mensagem_conversa on mensagem(conversa_id);

create table if not exists recado (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references lead(id) on delete cascade,
  mensagem text not null,
  created_at timestamptz not null default now()
);

-- LGPD: consentimento explícito com data (válido por 12 meses, checado no backend) ou até revogação.
-- usuario.permissao_assistente é mantido em sincronia pelo backend.
create table if not exists consentimento (
  usuario_id integer primary key references usuario(id) on delete cascade,
  concedido_em timestamptz not null,
  revogado_em timestamptz
);

-- RAG: trechos da base de conhecimento com embedding (text-embedding-3-small = 1536 dimensões).
create table if not exists knowledge_chunk (
  id bigserial primary key,
  categoria text not null,
  conteudo text not null,
  embedding vector(1536)
);

do $$
declare t text;
begin
  foreach t in array array['usuario', 'dependente', 'pet', 'planos', 'prestador', 'empresa',
                           'documento', 'lead', 'conversa', 'mensagem', 'recado', 'consentimento', 'knowledge_chunk']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
