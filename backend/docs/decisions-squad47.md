# Decisões da primeira implementação — Squad 47

## Referência e diferenças em relação à análise inicial

Referência lida integralmente: `Entrega Parcial Squad 47.docx`, 07/10/2026,
Desafio 03. O cabeçalho interno diz SQUAD 46; identificação editorial a corrigir
pelo autor. Nenhum segundo documento foi fornecido; o usuário orientou seguir.
O documento é fonte de requisitos, não uma ordem para substituir as convenções
oficiais ou criar módulos pertencentes aos outros squads.

Acréscimos/definições que a análise anterior não tinha como confirmar:

- Aprovação humana antes da publicação pública do prestador (H1).
- Solicitação de serviço pendente independente do restante do cadastro (H2/US05).
- Preço fixo ou faixa por associação prestador–serviço (H3/US04).
- Um cadastro profissional reutilizável em várias clínicas (H5).
- IA para descrição/tags, opcional, revisão humana e fallback manual (H10/US17–18).
- Elegibilidade da avaliação vinculada a uso real (H9), de responsabilidade externa.
- Detalhes de identidade, atestados e beneficios: apenas referências/contratos,
  sem duplicação de entidades ou decisões clínicas.

Uso único concorrente de token, minimização de dados e permissões já tinham sido
identificados na análise; a entrega agora fornece critérios de aceite explícitos.
A meta de pertinência da IA (85%), timeout de 3 s, circuit breaker e fornecedor
são propostas, não compromissos inter-squads já aprovados.

## Compatibilidade com CLAUDE.md

Monólito modular, PostgreSQL único, SQLAlchemy síncrono, camadas
router → service → repository. Queries e escrita de objetos ficam nos repositories;
transações e regras ficam nos services, sem imports de FastAPI. Schemas são
Pydantic v2 e respostas não retornam models diretamente.

Nomes de código/tabelas/endpoints em inglês; textos em português. Mantido
`{"error":{"code":"...","message":"..."}}`, em vez do formato traduzido proposto
no DOCX. Rotas de análise cadastral usam `approval-decisions`, evitando confusão
com avaliações de pacientes. Contexto explícito por UUID substitui `/me` porque
há vínculos múltiplos; contrato final de navegação depende dos squads.

## Entidades efetivamente persistidas

Categorias, tags, catálogo de serviços, prestadores e tags associadas, preços por
serviço, solicitações de catálogo, profissionais, vínculos profissionais,
empresas e vínculos de funcionários. Cada tabela tem UUID e timestamps UTC.
FKs internas, UNIQUEs de associações e CHECKs de preço/status/papel são aplicados
no PostgreSQL. DELETE de vínculo é lógico, preservando profissionais e usuários.
O UUID `responsible_user_id` permanece fora do vínculo removível: remover um
funcionário não remove o responsável da empresa nem o dono da clínica.

UUIDs de usuário são referências externas sem FK enquanto `users` não existir.
A identidade autenticada é fornecida por um port; vincular outra conta exige
`IdentityGateway.require_user`. Na integração oficial, alinhar schema/FK e
política de consentimento/convites; não criar tabelas de identidade locais.

## Permissões provisórias, conservadoras e centralizadas nos services

- Admin confiável: analisa cadastros/solicitações e administra catálogo.
- Dono do prestador: gerencia seu perfil, serviços e equipe.
- Manager ativo: gerencia perfil/serviços; não promove equipe nem altera papéis.
- Recepcionista/profissional ativo: consulta perfil administrativo; não consulta
  preços administrativos nem altera perfil/equipe.
- Responsável da empresa: cadastro e funcionários, inclusive atribuição de RH.
- RH ativo: cadastro e funcionários comuns; não cria RH nem altera vínculo de RH.
- Funcionário comum: sem acesso administrativo da empresa.
- Papéis globais `provider`/`company` habilitam cadastro; o vínculo local limita
  operações subsequentes. Admin tem acesso transversal explícito.

Esta matriz precisa ser aprovada com identidade/produto. Não implementamos a
permissão de validar cupons porque o contrato de consumo ainda não está conectado.
Vínculo profissional sem `user_id` não dá acesso à API. Cadastro com conta exige
usuário autenticado ser o titular ou admin; um gerente não pode reivindicar conta
alheia. Reuso de cadastro profissional de outra clínica exige titular/criador ou
admin, para não permitir associação por adivinhação de UUID. Convite/aceite ainda
é necessário para o fluxo completo de delegação entre titulares diferentes.

## Políticas operacionais desta primeira versão (não decisões gerais de produto)

- Cadastro de prestador nasce `pending`; somente `approved` aparece publicamente.
- Alteração de dados públicos envia novamente para análise; documentação e
  verificação profissional continuam humanas, sem consulta automática a conselhos.
- Decisão registra autor, momento e motivo. Não há histórico completo de revisões.
- Solicitação pendente é o rascunho independente; não publicamos serviço livre.
- Aprovação de solicitação exige referência a catálogo criado/conferido por admin;
  não cria preço nem associação automática.
- CNPJ: normalização e verificação de dígitos para formato numérico. CNPJ
  alfanumérico e verificação cadastral externa ainda não suportados.
- Não impomos unicidade de registro profissional: conselho, região e categoria
  precisam de definição antes de uma chave natural confiável.
- Busca de funcionários é por matrícula/departamento, não por nome/e-mail:
  identidade não foi duplicada. Busca nominal dependerá do diretório de usuários.
- PATCH de empresa não altera CNPJ ou responsável; transferência exige contrato.
- Ainda não há edição global de cadastro profissional, upload de foto,
  múltiplos endereços/unidades ou histórico/auditoria administrativa completo.
- Alterar preços/disponibilidade de catálogo aprovado não exige nova revisão de
  perfil; necessidade de moderação comercial ainda depende de produto.

## Integrações apenas preparadas

`app/integrations/identity.py`: autenticação e confirmação de UUID de usuário.
`app/integrations/contracts.py`: ports propostos para cupons, avaliações,
benefícios, documentos e sugestões de IA, com adapter não configurado que falha
explicitamente (503). Não existem chamadas HTTP a URLs adivinhadas, tabelas de
cupons/documentos/avaliações, nem endpoints que retornem sucesso fictício.

Os ports não são contratos oficiais aprovados. Payloads, erros, autorização,
timeouts, transporte interno/HTTP e assinatura idempotente precisam de acordo.
As futuras integrações não devem importar routers nem acessar tabelas alheias
para duplicar regra. No monólito, adapters poderão chamar services públicos.

O consumo único/atômico do token e sua elegibilidade pertencem ao dono de resgates;
consumir requer permissão específica e resposta mínima sem CPF ou dados clínicos.
Campanha geral ou por serviço e avaliação condicionada a atendimento confirmado
estão registrados, mas não implementados aqui. Benefícios não são revogados no
outro módulo simplesmente porque um vínculo foi desativado localmente: o efeito
sobre elegibilidade precisa de integração transacional/evento acordado.

IA: apenas port/schema. Nenhum fornecedor, prompt produtivo, armazenamento de
sugestões ou chamada paga foi configurado. Revisão humana, validação de catálogo,
minimização, timeout/fallback e proteção contra instruções no conteúdo devem ser
implementados antes de expor a função; o schema sozinho não garante essas regras.

## Pendências para integração oficial

1. Adapter real do Squad 1: sessão/cookie httpOnly, papéis, diretório, convites e
   aceite. Fechar SameSite/CORS/CSRF e propagação de contexto.
2. Definir responsável pela aprovação, documentos comprobatórios e reanálise.
3. Aprovar matriz de permissões e vínculo profissional/organização.
4. Conectar catálogo/perfis ao marketplace sem criar busca concorrente.
5. Acordar contratos de cupons, avaliações, planos e documentos.
6. Coordenar raiz Alembic e composição de `app.main` com os outros módulos;
   esta é uma migration inicial local, não uma nova raiz paralela para merge cego.
7. Adicionar auditoria, observabilidade, CI compartilhado e regras finais de mídia.

O frontend não foi alterado. Não foram feitos commits, merges, pushes ou PRs.
