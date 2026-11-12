-- P1 do review: retenção LGPD, trilha de consentimento e marcação dos dados de seed. Idempotente.

-- Apagar um usuário apaga leads e conversas dele (antes: set null deixava nome, telefone e chat órfãos).
alter table lead drop constraint if exists lead_usuario_id_fkey;
alter table lead add constraint lead_usuario_id_fkey
  foreign key (usuario_id) references usuario(id) on delete cascade;
alter table conversa drop constraint if exists conversa_usuario_id_fkey;
alter table conversa add constraint conversa_usuario_id_fkey
  foreign key (usuario_id) references usuario(id) on delete cascade;

-- Consentimento: `consentimento` guarda o estado atual; `consentimento_evento` é append-only
-- (prova do consentimento — LGPD art. 8º §2º). Nunca atualizar nem apagar eventos.
create table if not exists consentimento_evento (
  id bigserial primary key,
  usuario_id integer not null references usuario(id) on delete cascade,
  acao text not null check (acao in ('concedido', 'revogado')),
  origem text not null check (origem in ('botao', 'mensagem', 'api')),
  ocorrido_em timestamptz not null default now()
);
create index if not exists idx_consentimento_evento_usuario on consentimento_evento(usuario_id, ocorrido_em);
alter table consentimento_evento enable row level security;

-- Registra o estado atual de quem já tinha consentimento antes desta migração.
insert into consentimento_evento (usuario_id, acao, origem, ocorrido_em)
select c.usuario_id, 'concedido', 'api', c.concedido_em
from consentimento c
where c.revogado_em is null
  and not exists (select 1 from consentimento_evento e where e.usuario_id = c.usuario_id);

-- Documentos fictícios ficam marcados: o script de seed só apaga/recria estes, nunca os reais.
alter table documento add column if not exists seed boolean not null default false;
do $$
begin
  -- Na primeira execução, todos os documentos existentes vieram do gerador fictício.
  if not exists (select 1 from documento where seed) then
    update documento set seed = true;
  end if;
end $$;

-- Ordem das mensagens: now() é o horário da transação (empata num insert em lote);
-- clock_timestamp() distingue pergunta e resposta.
alter table mensagem alter column created_at set default clock_timestamp();
create index if not exists idx_mensagem_conversa_data on mensagem(conversa_id, created_at);
