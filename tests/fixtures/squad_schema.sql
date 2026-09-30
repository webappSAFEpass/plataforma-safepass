-- Réplica das tabelas do squad no Supabase (mesmos nomes e tipos), para testes em Postgres local/CI.
create table if not exists planos (
  id serial primary key,
  nome varchar not null,
  cadastro_administrador boolean,
  qtd_dependentes integer not null,
  qtd_avaliacoes_mes integer,
  acesso_cupom varchar,
  acumulo_ponto varchar,
  historico_saude boolean,
  cartao_fisico_beneficios boolean,
  checkup_gratuito boolean,
  valor numeric not null,
  desconto text
);
create table if not exists usuario (
  id serial primary key,
  nome varchar not null,
  data_nascimento date,
  cpf varchar,
  endereco text,
  telefone varchar,
  email varchar,
  possui_plano_saude boolean,
  plano_saude varchar,
  possui_outra_protecao boolean,
  valor_mensal_protecoes numeric,
  permissao_assistente boolean,
  plano_safepass_id integer references planos(id)
);
create table if not exists dependente (
  id serial primary key,
  usuario_id integer not null references usuario(id),
  nome varchar not null,
  data_nascimento date,
  cpf varchar,
  possui_plano_saude boolean,
  plano_saude varchar
);
create table if not exists pet (
  id serial primary key,
  usuario_id integer not null references usuario(id),
  nome varchar,
  data_nascimento date,
  especie varchar,
  raca varchar,
  gasto_medio_ano numeric,
  possui_plano_saude boolean,
  plano_saude varchar
);
create table if not exists prestador (
  id serial primary key,
  nome varchar not null,
  categoria varchar not null,
  registro_profissional varchar,
  telefone varchar,
  email varchar,
  descricao_atendimento text,
  tags_atendimento text[],
  modalidade_atendimento varchar,
  localizacao_atendimento varchar,
  faixa_preco varchar,
  avaliacao numeric,
  qtd_avaliacoes integer,
  data_cadastro timestamp
);
create table if not exists empresa (
  id serial primary key,
  nome varchar not null
);
