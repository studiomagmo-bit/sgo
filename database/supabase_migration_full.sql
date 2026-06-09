-- ============================================================
-- SGO — Sistema de Gestão Operacional de Obras
-- MIGRATION COMPLETA PARA O SUPABASE SQL EDITOR
-- Versão: 0.1.0  |  Gerado em: 2026-06-09
-- Repositório: https://github.com/studiomagmo-bit/sgo
--
-- INSTRUÇÕES DE USO:
--   1. Acesse o SQL Editor do Supabase:
--      https://supabase.com/dashboard/project/jsvdrmrfvlzeyskvprjv/sql
--   2. Clique em "New query"
--   3. Cole ESTE arquivo inteiro
--   4. Clique em "Run" (Ctrl+Enter)
--
-- CONTEÚDO (ordem de execução):
--   01  Extensions e ENUMs
--   02  Core: master, construtoras, usuarios, empreiteiros
--   03  Obras, estrutura recursiva, serviços
--   04  PCP: templates, atividades, dependências
--   05  Efetivo diário e produção
--   06  Fotos e impedimentos
--   07  Almoxarifado e equipamentos
--   08  Inspeções e pendências (+ FKs de fotos)
--   09  Contratos e medições
--   10  Diário de obra
--   11  RLS Policies (38 tabelas, isolamento multiempresa)
--   12  Triggers, functions e views de dashboard
-- ============================================================


-- ============================================================
-- SEÇÃO: EXTENSÕES E TIPOS CUSTOMIZADOS
-- Arquivo: 01_extensions_and_types.sql
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

-- Perfis de usuário da construtora
CREATE TYPE perfil_construtora AS ENUM (
  'administrador',
  'diretor',
  'gerente',
  'engenheiro',
  'mestre',
  'pcp',
  'almoxarife'
);

-- Perfis de usuário empreiteiro
CREATE TYPE perfil_empreiteiro AS ENUM (
  'administrador',
  'encarregado',
  'colaborador'
);

-- Tipo de obra
CREATE TYPE tipo_obra AS ENUM (
  'horizontal',
  'vertical',
  'avulsa'
);

-- Status da obra
CREATE TYPE status_obra AS ENUM (
  'planejamento',
  'em_andamento',
  'pausada',
  'concluida',
  'cancelada'
);

-- Tipo de nó da estrutura da obra
CREATE TYPE tipo_estrutura AS ENUM (
  'setor',
  'bloco',
  'torre',
  'pavimento',
  'unidade',
  'servico_avulso'
);

-- Tipo de apontamento do serviço
CREATE TYPE tipo_apontamento AS ENUM (
  'producao',
  'hora',
  'diaria'
);

-- Status de atividade PCP
CREATE TYPE status_atividade AS ENUM (
  'planejada',
  'em_andamento',
  'concluida',
  'bloqueada',
  'cancelada'
);

-- Prioridade de atividade
CREATE TYPE prioridade_atividade AS ENUM (
  'baixa',
  'media',
  'alta',
  'critica'
);

-- Tipo de produção
CREATE TYPE tipo_producao AS ENUM (
  'producao',
  'hora',
  'diaria'
);

-- Motivo de ausência no efetivo diário
CREATE TYPE motivo_ausencia AS ENUM (
  'falta',
  'atestado',
  'folga',
  'ferias',
  'demissao'
);

-- Categoria de impedimento
CREATE TYPE categoria_impedimento AS ENUM (
  'material',
  'mao_de_obra',
  'equipamento',
  'projeto',
  'cliente',
  'clima',
  'outro'
);

-- Status de impedimento
CREATE TYPE status_impedimento AS ENUM (
  'aberto',
  'em_resolucao',
  'resolvido'
);

-- Status de disponibilidade do almoxarifado
CREATE TYPE status_almoxarifado AS ENUM (
  'disponivel',
  'indisponivel',
  'parcial'
);

-- Status do equipamento
CREATE TYPE status_equipamento AS ENUM (
  'disponivel',
  'reservado',
  'em_uso',
  'manutencao',
  'inativo'
);

-- Origem do equipamento
CREATE TYPE origem_equipamento AS ENUM (
  'construtora',
  'empreiteiro'
);

-- Status de inspeção
CREATE TYPE status_inspecao AS ENUM (
  'aguardando',
  'aprovada',
  'aprovada_com_ressalvas',
  'reprovada'
);

-- Status de pendência
CREATE TYPE status_pendencia AS ENUM (
  'criada',
  'em_correcao',
  'corrigida',
  'validada',
  'cancelada'
);

-- Status do contrato
CREATE TYPE status_contrato AS ENUM (
  'ativo',
  'pausado',
  'encerrado',
  'cancelado'
);

-- Status de medição
CREATE TYPE status_medicao AS ENUM (
  'aberta',
  'fechada',
  'aprovada',
  'paga'
);

-- Status do banco de medição
CREATE TYPE status_banco_medicao AS ENUM (
  'pendente',
  'aprovado',
  'reprovado'
);

-- Tipo de foto
CREATE TYPE tipo_foto AS ENUM (
  'atividade',
  'pendencia',
  'inspecao',
  'diario',
  'equipamento'
);

-- ============================================================
-- SEÇÃO: CORE — MASTER, CONSTRUTORAS, USUÁRIOS, EMPREITEIROS
-- Arquivo: 02_core_tables.sql
-- ============================================================

CREATE TABLE master (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONSTRUTORAS
-- ============================================================
CREATE TABLE construtoras (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id     UUID NOT NULL REFERENCES master(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  cnpj          TEXT UNIQUE,
  logo_url      TEXT,
  ativa         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_construtoras_master ON construtoras(master_id);

-- ============================================================
-- USUÁRIOS (extensão do auth.users do Supabase)
-- ============================================================
CREATE TABLE usuarios (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  construtora_id  UUID REFERENCES construtoras(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL,
  telefone        TEXT,
  avatar_url      TEXT,
  perfil          perfil_construtora,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_construtora ON usuarios(construtora_id);
CREATE INDEX idx_usuarios_email       ON usuarios(email);

-- ============================================================
-- EMPREITEIROS (empresa terceirizada)
-- ============================================================
CREATE TABLE empreiteiros (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  razao_social   TEXT NOT NULL,
  nome_fantasia  TEXT,
  cnpj           TEXT,
  responsavel    TEXT,
  telefone       TEXT,
  email          TEXT,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_empreiteiros_construtora ON empreiteiros(construtora_id);

-- ============================================================
-- USUÁRIOS EMPREITEIRO (vinculados ao empreiteiro, não à construtora)
-- ============================================================
CREATE TABLE usuarios_empreiteiro (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empreiteiro_id UUID NOT NULL REFERENCES empreiteiros(id) ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL,
  telefone       TEXT,
  avatar_url     TEXT,
  perfil         perfil_empreiteiro NOT NULL DEFAULT 'colaborador',
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_emp_empreiteiro  ON usuarios_empreiteiro(empreiteiro_id);
CREATE INDEX idx_usuarios_emp_construtora  ON usuarios_empreiteiro(construtora_id);

-- ============================================================
-- COLABORADORES (mão de obra cadastrada nos empreiteiros)
-- ============================================================
CREATE TABLE colaboradores (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empreiteiro_id UUID NOT NULL REFERENCES empreiteiros(id) ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  cpf            TEXT,
  funcao         TEXT,
  telefone       TEXT,
  foto_url       TEXT,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_colaboradores_empreiteiro ON colaboradores(empreiteiro_id);
CREATE INDEX idx_colaboradores_construtora ON colaboradores(construtora_id);

-- ============================================================
-- SEÇÃO: OBRAS, ESTRUTURA UNIVERSAL E BIBLIOTECA DE SERVIÇOS
-- Arquivo: 03_obras.sql
-- ============================================================

CREATE TABLE obras (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  tipo           tipo_obra NOT NULL DEFAULT 'avulsa',
  descricao      TEXT,
  endereco       TEXT,
  cidade         TEXT,
  estado         CHAR(2),
  cep            TEXT,
  data_inicio    DATE,
  data_fim_prev  DATE,
  data_fim_real  DATE,
  area_total     NUMERIC(12,2),
  status         status_obra NOT NULL DEFAULT 'planejamento',
  gerente_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  engenheiro_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  foto_capa_url  TEXT,
  ativa          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_obras_construtora ON obras(construtora_id);
CREATE INDEX idx_obras_status       ON obras(status);

-- ============================================================
-- OBRA_USUARIOS (equipe vinculada à obra)
-- ============================================================
CREATE TABLE obra_usuarios (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id    UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obra_id, usuario_id)
);

CREATE INDEX idx_obra_usuarios_obra    ON obra_usuarios(obra_id);
CREATE INDEX idx_obra_usuarios_usuario ON obra_usuarios(usuario_id);

-- ============================================================
-- OBRA_EMPREITEIROS (empreiteiros vinculados à obra)
-- ============================================================
CREATE TABLE obra_empreiteiros (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id        UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  empreiteiro_id UUID NOT NULL REFERENCES empreiteiros(id) ON DELETE CASCADE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obra_id, empreiteiro_id)
);

CREATE INDEX idx_obra_empreiteiros_obra        ON obra_empreiteiros(obra_id);
CREATE INDEX idx_obra_empreiteiros_empreiteiro ON obra_empreiteiros(empreiteiro_id);

-- ============================================================
-- ESTRUTURA DA OBRA (árvore recursiva)
-- ============================================================
CREATE TABLE estrutura_obra (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id        UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  parent_id      UUID REFERENCES estrutura_obra(id) ON DELETE CASCADE,
  tipo           tipo_estrutura NOT NULL,
  nome           TEXT NOT NULL,
  codigo         TEXT,                          -- ex: "A01", "P02"
  descricao      TEXT,
  ordem          INTEGER NOT NULL DEFAULT 0,    -- ordem de exibição
  area           NUMERIC(10,2),
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estrutura_obra_obra   ON estrutura_obra(obra_id);
CREATE INDEX idx_estrutura_obra_parent ON estrutura_obra(parent_id);

-- ============================================================
-- BIBLIOTECA DE SERVIÇOS (padrão por construtora)
-- ============================================================
CREATE TABLE servicos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  unidade        TEXT NOT NULL,                 -- m², m³, hr, un, kg...
  tipo_apontamento tipo_apontamento NOT NULL DEFAULT 'producao',
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_servicos_construtora ON servicos(construtora_id);

-- ============================================================
-- MATERIAIS POR SERVIÇO (composição)
-- ============================================================
CREATE TABLE servico_materiais (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servico_id  UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  material    TEXT NOT NULL,                    -- nome do material
  unidade     TEXT NOT NULL,                    -- unidade do material
  quantidade  NUMERIC(10,4),                    -- quantidade por unidade de serviço
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_servico_materiais_servico ON servico_materiais(servico_id);

-- ============================================================
-- SEÇÃO: PCP — TEMPLATES E ATIVIDADES
-- Arquivo: 04_pcp.sql
-- ============================================================

CREATE TABLE pcp_templates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,                 -- ex: "Casa Popular"
  descricao      TEXT,
  tipo_obra      tipo_obra,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pcp_templates_construtora ON pcp_templates(construtora_id);

-- ============================================================
-- ITENS DO TEMPLATE
-- ============================================================
CREATE TABLE pcp_template_itens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES pcp_templates(id) ON DELETE CASCADE,
  parent_item_id  UUID REFERENCES pcp_template_itens(id) ON DELETE SET NULL,
  servico_id      UUID REFERENCES servicos(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  ordem           INTEGER NOT NULL DEFAULT 0,
  duracao_dias    INTEGER,                      -- duração prevista
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pcp_template_itens_template ON pcp_template_itens(template_id);

-- ============================================================
-- ATIVIDADES PCP
-- ============================================================
CREATE TABLE atividades (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id           UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id    UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  estrutura_id      UUID REFERENCES estrutura_obra(id) ON DELETE SET NULL,
  servico_id        UUID REFERENCES servicos(id) ON DELETE SET NULL,
  empreiteiro_id    UUID REFERENCES empreiteiros(id) ON DELETE SET NULL,
  responsavel_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  template_item_id  UUID REFERENCES pcp_template_itens(id) ON DELETE SET NULL,

  -- Dados principais
  nome              TEXT NOT NULL,
  descricao         TEXT,
  local             TEXT,

  -- Quantidades
  quantidade_prev   NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_exec   NUMERIC(12,3) NOT NULL DEFAULT 0,
  unidade           TEXT,

  -- Datas
  data_inicio_prev  DATE,
  data_fim_prev     DATE,
  data_inicio_real  DATE,
  data_fim_real     DATE,

  -- Status e prioridade
  status            status_atividade NOT NULL DEFAULT 'planejada',
  prioridade        prioridade_atividade NOT NULL DEFAULT 'media',

  -- Controle
  percentual_exec   NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentual_exec BETWEEN 0 AND 100),
  bloqueada         BOOLEAN NOT NULL DEFAULT FALSE,
  libera_medicao    BOOLEAN NOT NULL DEFAULT FALSE,

  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_atividades_obra          ON atividades(obra_id);
CREATE INDEX idx_atividades_construtora   ON atividades(construtora_id);
CREATE INDEX idx_atividades_estrutura     ON atividades(estrutura_id);
CREATE INDEX idx_atividades_empreiteiro   ON atividades(empreiteiro_id);
CREATE INDEX idx_atividades_status        ON atividades(status);
CREATE INDEX idx_atividades_data_inicio   ON atividades(data_inicio_prev);

-- ============================================================
-- DEPENDÊNCIAS ENTRE ATIVIDADES
-- ============================================================
CREATE TABLE atividade_dependencias (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atividade_id          UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  atividade_depende_id  UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(atividade_id, atividade_depende_id),
  CHECK (atividade_id <> atividade_depende_id)
);

CREATE INDEX idx_atividade_dep_atividade ON atividade_dependencias(atividade_id);
CREATE INDEX idx_atividade_dep_depende   ON atividade_dependencias(atividade_depende_id);

-- ============================================================
-- REPLICAÇÃO DE TEMPLATE EM OBRA (log de aplicação)
-- ============================================================
CREATE TABLE pcp_template_aplicacoes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id           UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  template_id       UUID NOT NULL REFERENCES pcp_templates(id) ON DELETE CASCADE,
  estrutura_id      UUID REFERENCES estrutura_obra(id) ON DELETE SET NULL,
  aplicado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  qtd_atividades    INTEGER NOT NULL DEFAULT 0,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_aplicacoes_obra ON pcp_template_aplicacoes(obra_id);

-- ============================================================
-- SEÇÃO: EFETIVO DIÁRIO E PRODUÇÃO
-- Arquivo: 05_efetivo_producao.sql
-- ============================================================

CREATE TABLE efetivo_diario (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id        UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  empreiteiro_id UUID NOT NULL REFERENCES empreiteiros(id) ON DELETE CASCADE,
  encarregado_id UUID REFERENCES usuarios_empreiteiro(id) ON DELETE SET NULL,
  data           DATE NOT NULL,
  observacoes    TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obra_id, empreiteiro_id, data)
);

CREATE INDEX idx_efetivo_diario_obra        ON efetivo_diario(obra_id);
CREATE INDEX idx_efetivo_diario_construtora ON efetivo_diario(construtora_id);
CREATE INDEX idx_efetivo_diario_empreiteiro ON efetivo_diario(empreiteiro_id);
CREATE INDEX idx_efetivo_diario_data        ON efetivo_diario(data);

-- ============================================================
-- EFETIVO DIÁRIO - COLABORADORES (presença)
-- ============================================================
CREATE TABLE efetivo_colaboradores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  efetivo_id      UUID NOT NULL REFERENCES efetivo_diario(id) ON DELETE CASCADE,
  colaborador_id  UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  presente        BOOLEAN NOT NULL DEFAULT TRUE,
  motivo_ausencia motivo_ausencia,
  horas_trabalhadas NUMERIC(4,2) DEFAULT 8,
  observacao      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(efetivo_id, colaborador_id)
);

CREATE INDEX idx_efetivo_colab_efetivo     ON efetivo_colaboradores(efetivo_id);
CREATE INDEX idx_efetivo_colab_colaborador ON efetivo_colaboradores(colaborador_id);

-- ============================================================
-- PRODUÇÕES (lançamento por atividade)
-- ============================================================
CREATE TABLE producoes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id        UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  atividade_id   UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  empreiteiro_id UUID REFERENCES empreiteiros(id) ON DELETE SET NULL,
  efetivo_id     UUID REFERENCES efetivo_diario(id) ON DELETE SET NULL,
  lancado_por    UUID REFERENCES usuarios_empreiteiro(id) ON DELETE SET NULL,

  data           DATE NOT NULL,
  tipo           tipo_producao NOT NULL DEFAULT 'producao',
  quantidade     NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  unidade        TEXT NOT NULL,
  observacao     TEXT,

  -- Status de validação
  validada       BOOLEAN NOT NULL DEFAULT FALSE,
  validada_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  validada_em    TIMESTAMPTZ,

  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_producoes_obra        ON producoes(obra_id);
CREATE INDEX idx_producoes_construtora ON producoes(construtora_id);
CREATE INDEX idx_producoes_atividade   ON producoes(atividade_id);
CREATE INDEX idx_producoes_empreiteiro ON producoes(empreiteiro_id);
CREATE INDEX idx_producoes_data        ON producoes(data);

-- ============================================================
-- PRODUÇÃO INDIVIDUAL (divisão entre colaboradores)
-- ============================================================
CREATE TABLE producao_individual (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producao_id     UUID NOT NULL REFERENCES producoes(id) ON DELETE CASCADE,
  colaborador_id  UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  percentual      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentual BETWEEN 0 AND 100),
  quantidade      NUMERIC(12,3) NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(producao_id, colaborador_id)
);

CREATE INDEX idx_prod_individual_producao    ON producao_individual(producao_id);
CREATE INDEX idx_prod_individual_colaborador ON producao_individual(colaborador_id);

-- ============================================================
-- SEÇÃO: FOTOS E IMPEDIMENTOS
-- Arquivo: 06_fotos_impedimentos.sql
-- ============================================================

CREATE TABLE fotos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  tipo            tipo_foto NOT NULL,

  -- Vínculos polimórficos (apenas um preenchido por vez)
  -- FKs de pendencia_id e inspecao_id adicionadas via ALTER TABLE no arquivo 08
  atividade_id    UUID REFERENCES atividades(id)   ON DELETE CASCADE,
  pendencia_id    UUID,
  inspecao_id     UUID,
  equipamento_id  UUID,                             -- FK adicionada via ALTER TABLE (seção 07)

  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  nome_arquivo    TEXT,
  tamanho_bytes   INTEGER,
  mime_type       TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  legenda         TEXT,
  tirada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fotos_obra        ON fotos(obra_id);
CREATE INDEX idx_fotos_tipo        ON fotos(tipo);
CREATE INDEX idx_fotos_atividade   ON fotos(atividade_id);
CREATE INDEX idx_fotos_pendencia   ON fotos(pendencia_id);
CREATE INDEX idx_fotos_inspecao    ON fotos(inspecao_id);

-- ============================================================
-- IMPEDIMENTOS
-- ============================================================
CREATE TABLE impedimentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atividade_id    UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  categoria       categoria_impedimento NOT NULL,
  descricao       TEXT NOT NULL,
  status          status_impedimento NOT NULL DEFAULT 'aberto',
  responsavel_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_resolucao  DATE,
  resolucao       TEXT,
  criado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impedimentos_atividade  ON impedimentos(atividade_id);
CREATE INDEX idx_impedimentos_obra       ON impedimentos(obra_id);
CREATE INDEX idx_impedimentos_status     ON impedimentos(status);
CREATE INDEX idx_impedimentos_categoria  ON impedimentos(categoria);

-- ============================================================
-- SEÇÃO: ALMOXARIFADO E EQUIPAMENTOS
-- Arquivo: 07_almoxarifado_equipamentos.sql
-- ============================================================

CREATE TABLE almoxarifado_validacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atividade_id    UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  material        TEXT NOT NULL,
  unidade         TEXT,
  quantidade_sol  NUMERIC(12,3),                -- quantidade solicitada
  status          status_almoxarifado NOT NULL DEFAULT 'disponivel',
  observacao      TEXT,
  validado_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_em     TIMESTAMPTZ,
  criado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_almox_atividade    ON almoxarifado_validacoes(atividade_id);
CREATE INDEX idx_almox_obra         ON almoxarifado_validacoes(obra_id);
CREATE INDEX idx_almox_status       ON almoxarifado_validacoes(status);

-- ============================================================
-- EQUIPAMENTOS
-- ============================================================
CREATE TABLE equipamentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  empreiteiro_id  UUID REFERENCES empreiteiros(id) ON DELETE SET NULL,
  origem          origem_equipamento NOT NULL DEFAULT 'construtora',
  nome            TEXT NOT NULL,
  descricao       TEXT,
  codigo_patrimonial TEXT,
  numero_serie    TEXT,
  modelo          TEXT,
  fabricante      TEXT,
  ano_fabricacao  INTEGER,
  foto_url        TEXT,
  status          status_equipamento NOT NULL DEFAULT 'disponivel',
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipamentos_construtora  ON equipamentos(construtora_id);
CREATE INDEX idx_equipamentos_empreiteiro  ON equipamentos(empreiteiro_id);

CREATE INDEX idx_equipamentos_status       ON equipamentos(status);

-- FK de fotos → equipamentos (fotos criada antes de equipamentos)
ALTER TABLE fotos
  ADD CONSTRAINT fk_fotos_equipamento
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE;

-- ============================================================
-- MOVIMENTAÇÃO / ALOCAÇÃO DE EQUIPAMENTOS
-- ============================================================
CREATE TABLE equipamento_alocacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipamento_id  UUID NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  atividade_id    UUID REFERENCES atividades(id) ON DELETE SET NULL,
  status          status_equipamento NOT NULL DEFAULT 'reservado',
  data_inicio     DATE NOT NULL,
  data_fim_prev   DATE,
  data_fim_real   DATE,
  observacoes     TEXT,
  solicitado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equip_aloc_equipamento ON equipamento_alocacoes(equipamento_id);
CREATE INDEX idx_equip_aloc_obra        ON equipamento_alocacoes(obra_id);
CREATE INDEX idx_equip_aloc_status      ON equipamento_alocacoes(status);

-- ============================================================
-- MANUTENÇÕES DE EQUIPAMENTOS
-- ============================================================
CREATE TABLE equipamento_manutencoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipamento_id  UUID NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,               -- preventiva, corretiva
  descricao       TEXT NOT NULL,
  data_entrada    DATE NOT NULL,
  data_saida      DATE,
  custo           NUMERIC(12,2),
  responsavel     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equip_manut_equipamento ON equipamento_manutencoes(equipamento_id);

-- ============================================================
-- SEÇÃO: INSPEÇÕES E PENDÊNCIAS
-- Arquivo: 08_inspecoes_pendencias.sql
-- ============================================================

CREATE TABLE inspecoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atividade_id    UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  inspetor_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  status          status_inspecao NOT NULL DEFAULT 'aguardando',
  observacoes     TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_inspecao   TIMESTAMPTZ,
  libera_medicao  BOOLEAN NOT NULL DEFAULT FALSE,
  criado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspecoes_atividade    ON inspecoes(atividade_id);
CREATE INDEX idx_inspecoes_obra         ON inspecoes(obra_id);
CREATE INDEX idx_inspecoes_inspetor     ON inspecoes(inspetor_id);
CREATE INDEX idx_inspecoes_status       ON inspecoes(status);

-- ============================================================
-- PENDÊNCIAS (geradas pelas inspeções ou manualmente)
-- ============================================================
CREATE TABLE pendencias (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspecao_id     UUID REFERENCES inspecoes(id) ON DELETE SET NULL,
  atividade_id    UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  responsavel_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  descricao       TEXT NOT NULL,
  status          status_pendencia NOT NULL DEFAULT 'criada',
  prazo           DATE,
  corrigida_em    TIMESTAMPTZ,
  corrigida_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validada_em     TIMESTAMPTZ,
  validada_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  observacao_correcao TEXT,
  observacao_validacao TEXT,
  criado_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pendencias_inspecao    ON pendencias(inspecao_id);
CREATE INDEX idx_pendencias_atividade   ON pendencias(atividade_id);
CREATE INDEX idx_pendencias_obra        ON pendencias(obra_id);
CREATE INDEX idx_pendencias_responsavel ON pendencias(responsavel_id);
CREATE INDEX idx_pendencias_status      ON pendencias(status);

-- ============================================================
-- ALTER TABLE FOTOS: adicionar FKs para pendencias e inspecoes
-- (tabela fotos criada no arquivo 06 sem essas FKs)
-- ============================================================
ALTER TABLE fotos
  ADD CONSTRAINT fk_fotos_pendencia
    FOREIGN KEY (pendencia_id) REFERENCES pendencias(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_fotos_inspecao
    FOREIGN KEY (inspecao_id) REFERENCES inspecoes(id) ON DELETE CASCADE;

-- ============================================================
-- SEÇÃO: CONTRATOS E MEDIÇÕES
-- Arquivo: 09_contratos_medicoes.sql
-- ============================================================

CREATE TABLE contratos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  empreiteiro_id  UUID NOT NULL REFERENCES empreiteiros(id) ON DELETE CASCADE,
  numero          TEXT,
  descricao       TEXT,
  data_inicio     DATE,
  data_fim_prev   DATE,
  valor_total     NUMERIC(15,2),
  status          status_contrato NOT NULL DEFAULT 'ativo',
  observacoes     TEXT,
  criado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contratos_construtora  ON contratos(construtora_id);
CREATE INDEX idx_contratos_obra         ON contratos(obra_id);
CREATE INDEX idx_contratos_empreiteiro  ON contratos(empreiteiro_id);
CREATE INDEX idx_contratos_status       ON contratos(status);

-- ============================================================
-- ITENS DO CONTRATO (composição de preços)
-- ============================================================
CREATE TABLE contrato_itens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id  UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  servico_id   UUID REFERENCES servicos(id) ON DELETE SET NULL,
  descricao    TEXT NOT NULL,
  unidade      TEXT NOT NULL,
  quantidade   NUMERIC(12,3) NOT NULL DEFAULT 0,
  valor_unit   NUMERIC(12,4) NOT NULL DEFAULT 0,
  valor_total  NUMERIC(15,2) GENERATED ALWAYS AS (quantidade * valor_unit) STORED,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contrato_itens_contrato ON contrato_itens(contrato_id);
CREATE INDEX idx_contrato_itens_servico  ON contrato_itens(servico_id);

-- ============================================================
-- MEDIÇÕES
-- ============================================================
CREATE TABLE medicoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  contrato_id     UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  empreiteiro_id  UUID NOT NULL REFERENCES empreiteiros(id) ON DELETE CASCADE,
  numero          INTEGER NOT NULL,
  periodo_inicio  DATE NOT NULL,
  periodo_fim     DATE NOT NULL,
  status          status_medicao NOT NULL DEFAULT 'aberta',
  valor_bruto     NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_desconto  NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_liquido   NUMERIC(15,2) GENERATED ALWAYS AS (valor_bruto - valor_desconto) STORED,
  observacoes     TEXT,
  aprovada_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  aprovada_em     TIMESTAMPTZ,
  fechada_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fechada_em      TIMESTAMPTZ,
  criado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contrato_id, numero)
);

CREATE INDEX idx_medicoes_construtora  ON medicoes(construtora_id);
CREATE INDEX idx_medicoes_obra         ON medicoes(obra_id);
CREATE INDEX idx_medicoes_contrato     ON medicoes(contrato_id);
CREATE INDEX idx_medicoes_empreiteiro  ON medicoes(empreiteiro_id);
CREATE INDEX idx_medicoes_status       ON medicoes(status);

-- ============================================================
-- BANCO DE MEDIÇÃO (itens medidos por atividade)
-- ============================================================
CREATE TABLE banco_medicao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicao_id      UUID NOT NULL REFERENCES medicoes(id) ON DELETE CASCADE,
  atividade_id    UUID NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  contrato_item_id UUID REFERENCES contrato_itens(id) ON DELETE SET NULL,
  inspecao_id     UUID REFERENCES inspecoes(id) ON DELETE SET NULL,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  descricao       TEXT NOT NULL,
  unidade         TEXT NOT NULL,
  quantidade_prev NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantidade_exec NUMERIC(12,3) NOT NULL DEFAULT 0,
  valor_unit      NUMERIC(12,4) NOT NULL DEFAULT 0,
  valor_total     NUMERIC(15,2) GENERATED ALWAYS AS (quantidade_exec * valor_unit) STORED,
  status          status_banco_medicao NOT NULL DEFAULT 'pendente',
  observacoes     TEXT,
  aprovado_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  aprovado_em     TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banco_med_medicao    ON banco_medicao(medicao_id);
CREATE INDEX idx_banco_med_atividade  ON banco_medicao(atividade_id);
CREATE INDEX idx_banco_med_status     ON banco_medicao(status);

-- ============================================================
-- SEÇÃO: DIÁRIO DE OBRA
-- Arquivo: 10_diario_obra.sql
-- ============================================================

CREATE TABLE diario_obra (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id         UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id  UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  data            DATE NOT NULL,

  -- Efetivo resumido
  efetivo_previsto   INTEGER NOT NULL DEFAULT 0,
  efetivo_presente   INTEGER NOT NULL DEFAULT 0,
  efetivo_ausente    INTEGER NOT NULL DEFAULT 0,

  -- Condição climática
  clima_manha        TEXT,                     -- sol, nublado, chuva
  clima_tarde        TEXT,
  clima_noite        TEXT,
  temperatura_min    NUMERIC(4,1),
  temperatura_max    NUMERIC(4,1),
  chuva_mm           NUMERIC(6,2),

  -- Totais calculados
  total_producoes    INTEGER NOT NULL DEFAULT 0,
  total_impedimentos INTEGER NOT NULL DEFAULT 0,
  total_pendencias   INTEGER NOT NULL DEFAULT 0,
  total_inspecoes    INTEGER NOT NULL DEFAULT 0,
  total_fotos        INTEGER NOT NULL DEFAULT 0,

  -- Texto gerado / observações gerais
  descricao_geral    TEXT,
  observacoes        TEXT,

  -- Controle
  gerado_auto    BOOLEAN NOT NULL DEFAULT TRUE,
  publicado      BOOLEAN NOT NULL DEFAULT FALSE,
  assinado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  assinado_em    TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obra_id, data)
);

CREATE INDEX idx_diario_obra_obra  ON diario_obra(obra_id);
CREATE INDEX idx_diario_obra_data  ON diario_obra(data);

-- ============================================================
-- DIÁRIO - ATIVIDADES DO DIA (snapshot)
-- ============================================================
CREATE TABLE diario_atividades (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id       UUID NOT NULL REFERENCES diario_obra(id) ON DELETE CASCADE,
  atividade_id    UUID REFERENCES atividades(id) ON DELETE SET NULL,
  nome_atividade  TEXT NOT NULL,
  local           TEXT,
  empreiteiro     TEXT,
  quantidade_exec NUMERIC(12,3),
  unidade         TEXT,
  percentual_exec NUMERIC(5,2),
  status          TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diario_atv_diario    ON diario_atividades(diario_id);
CREATE INDEX idx_diario_atv_atividade ON diario_atividades(atividade_id);

-- ============================================================
-- DIÁRIO - OCORRÊNCIAS / EVENTOS DO DIA
-- ============================================================
CREATE TABLE diario_ocorrencias (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id   UUID NOT NULL REFERENCES diario_obra(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,                   -- impedimento, pendencia, inspecao, etc.
  descricao   TEXT NOT NULL,
  referencia_id UUID,                          -- id do registro de origem
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diario_ocorr_diario ON diario_ocorrencias(diario_id);

-- ============================================================
-- DIÁRIO - EQUIPE DO DIA (snapshot de presença)
-- ============================================================
CREATE TABLE diario_equipe (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diario_id       UUID NOT NULL REFERENCES diario_obra(id) ON DELETE CASCADE,
  empreiteiro     TEXT NOT NULL,
  encarregado     TEXT,
  total_presentes INTEGER NOT NULL DEFAULT 0,
  total_ausentes  INTEGER NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diario_equipe_diario ON diario_equipe(diario_id);

-- ============================================================
-- SEÇÃO: ROW LEVEL SECURITY — MULTIEMPRESA
-- Arquivo: 11_rls_policies.sql
-- ============================================================

ALTER TABLE master                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE construtoras              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE empreiteiros              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empreiteiro      ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_empreiteiros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrutura_obra            ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico_materiais         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcp_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcp_template_itens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_dependencias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE efetivo_diario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE efetivo_colaboradores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE producoes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_individual       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE impedimentos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE almoxarifado_validacoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_alocacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_manutencoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspecoes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendencias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_itens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_medicao             ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_obra               ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_atividades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_ocorrencias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_equipe             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcp_template_aplicacoes   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna construtora_id do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION get_construtora_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT construtora_id FROM usuarios WHERE id = auth.uid()
  UNION ALL
  SELECT construtora_id FROM usuarios_empreiteiro WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna empreiteiro_id do usuário logado
-- (apenas para usuários do tipo empreiteiro)
-- ============================================================
CREATE OR REPLACE FUNCTION get_empreiteiro_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT empreiteiro_id FROM usuarios_empreiteiro WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna perfil do usuário logado (construtora)
-- ============================================================
CREATE OR REPLACE FUNCTION get_perfil_construtora()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT perfil::TEXT FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: verifica se é usuário da construtora
-- ============================================================
CREATE OR REPLACE FUNCTION is_construtora_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid());
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: verifica se é administrador
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil = 'administrador'
  );
$$;

-- ============================================================
-- POLÍTICAS: CONSTRUTORAS
-- ============================================================
CREATE POLICY "construtoras_select"
  ON construtoras FOR SELECT
  USING (id = get_construtora_id());

CREATE POLICY "construtoras_manage"
  ON construtoras FOR ALL
  USING (id = get_construtora_id() AND is_admin());

-- ============================================================
-- POLÍTICAS: USUÁRIOS
-- ============================================================
CREATE POLICY "usuarios_select"
  ON usuarios FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "usuarios_manage"
  ON usuarios FOR ALL
  USING (construtora_id = get_construtora_id() AND is_admin());

CREATE POLICY "usuarios_self"
  ON usuarios FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- POLÍTICAS: EMPREITEIROS
-- ============================================================
CREATE POLICY "empreiteiros_select"
  ON empreiteiros FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "empreiteiros_manage"
  ON empreiteiros FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: COLABORADORES
-- ============================================================
CREATE POLICY "colaboradores_select"
  ON colaboradores FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "colaboradores_manage"
  ON colaboradores FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND (
      get_perfil_construtora() IN ('administrador','gerente','mestre')
      OR empreiteiro_id = get_empreiteiro_id()
    )
  );

-- ============================================================
-- POLÍTICAS: OBRAS
-- ============================================================
CREATE POLICY "obras_select"
  ON obras FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "obras_manage"
  ON obras FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: ESTRUTURA OBRA
-- ============================================================
CREATE POLICY "estrutura_obra_select"
  ON estrutura_obra FOR SELECT
  USING (
    obra_id IN (SELECT id FROM obras WHERE construtora_id = get_construtora_id())
  );

CREATE POLICY "estrutura_obra_manage"
  ON estrutura_obra FOR ALL
  USING (
    obra_id IN (SELECT id FROM obras WHERE construtora_id = get_construtora_id())
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','pcp')
  );

-- ============================================================
-- POLÍTICAS: SERVIÇOS
-- ============================================================
CREATE POLICY "servicos_select"
  ON servicos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "servicos_manage"
  ON servicos FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','pcp')
  );

-- ============================================================
-- POLÍTICAS: ATIVIDADES
-- ============================================================
CREATE POLICY "atividades_select"
  ON atividades FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "atividades_manage"
  ON atividades FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','pcp','mestre')
  );

-- ============================================================
-- POLÍTICAS: PRODUÇÕES (construtora vê tudo; encarregado só da sua equipe)
-- ============================================================
CREATE POLICY "producoes_select_construtora"
  ON producoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "producoes_select_empreiteiro"
  ON producoes FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "producoes_insert_encarregado"
  ON producoes FOR INSERT
  WITH CHECK (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "producoes_manage_construtora"
  ON producoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','mestre')
  );

-- ============================================================
-- POLÍTICAS: EFETIVO DIÁRIO
-- ============================================================
CREATE POLICY "efetivo_select_construtora"
  ON efetivo_diario FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "efetivo_select_empreiteiro"
  ON efetivo_diario FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "efetivo_manage_construtora"
  ON efetivo_diario FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','mestre')
  );

CREATE POLICY "efetivo_manage_empreiteiro"
  ON efetivo_diario FOR INSERT
  WITH CHECK (empreiteiro_id = get_empreiteiro_id());

-- ============================================================
-- POLÍTICAS: FOTOS
-- ============================================================
CREATE POLICY "fotos_select"
  ON fotos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "fotos_insert"
  ON fotos FOR INSERT
  WITH CHECK (construtora_id = get_construtora_id());

CREATE POLICY "fotos_delete"
  ON fotos FOR DELETE
  USING (
    construtora_id = get_construtora_id()
    AND (criado_por = auth.uid() OR is_admin())
  );

-- ============================================================
-- POLÍTICAS: IMPEDIMENTOS
-- ============================================================
CREATE POLICY "impedimentos_select"
  ON impedimentos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "impedimentos_manage"
  ON impedimentos FOR ALL
  USING (construtora_id = get_construtora_id());

-- ============================================================
-- POLÍTICAS: INSPEÇÕES
-- ============================================================
CREATE POLICY "inspecoes_select"
  ON inspecoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "inspecoes_manage"
  ON inspecoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro')
  );

-- ============================================================
-- POLÍTICAS: PENDÊNCIAS
-- ============================================================
CREATE POLICY "pendencias_select"
  ON pendencias FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "pendencias_manage"
  ON pendencias FOR ALL
  USING (construtora_id = get_construtora_id());

-- ============================================================
-- POLÍTICAS: CONTRATOS (empreiteiro vê apenas o seu)
-- ============================================================
CREATE POLICY "contratos_select_construtora"
  ON contratos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "contratos_select_empreiteiro"
  ON contratos FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "contratos_manage"
  ON contratos FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: MEDIÇÕES (empreiteiro vê; construtora gerencia)
-- ============================================================
CREATE POLICY "medicoes_select_construtora"
  ON medicoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "medicoes_select_empreiteiro"
  ON medicoes FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "medicoes_manage"
  ON medicoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro')
  );

-- ============================================================
-- POLÍTICAS: EQUIPAMENTOS
-- ============================================================
CREATE POLICY "equipamentos_select"
  ON equipamentos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "equipamentos_manage"
  ON equipamentos FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: DIÁRIO DE OBRA
-- ============================================================
CREATE POLICY "diario_select"
  ON diario_obra FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "diario_manage"
  ON diario_obra FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','mestre')
  );

-- ============================================================
-- POLÍTICAS: ALMOXARIFADO
-- ============================================================
CREATE POLICY "almox_select"
  ON almoxarifado_validacoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "almox_manage"
  ON almoxarifado_validacoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','almoxarife','engenheiro')
  );

-- ============================================================
-- SEÇÃO: TRIGGERS, FUNCTIONS E VIEWS
-- Arquivo: 12_triggers_functions_views.sql
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar trigger em todas as tabelas com atualizado_em
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'master','construtoras','usuarios','empreiteiros',
    'usuarios_empreiteiro','colaboradores','obras',
    'estrutura_obra','servicos','pcp_templates',
    'atividades','efetivo_diario','producoes',
    'almoxarifado_validacoes','equipamentos',
    'equipamento_alocacoes','equipamento_manutencoes',
    'inspecoes','pendencias','contratos','contrato_itens',
    'medicoes','banco_medicao','diario_obra'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- FUNÇÃO: cria usuário na tabela usuarios ao registrar no Auth
-- ============================================================
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================
-- FUNÇÃO: atualiza percentual_exec da atividade após produção
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_atividade_percentual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_qtd_prev  NUMERIC;
  v_qtd_exec  NUMERIC;
  v_perc      NUMERIC;
BEGIN
  SELECT quantidade_prev INTO v_qtd_prev
  FROM atividades WHERE id = NEW.atividade_id;

  SELECT COALESCE(SUM(quantidade), 0) INTO v_qtd_exec
  FROM producoes WHERE atividade_id = NEW.atividade_id;

  IF v_qtd_prev > 0 THEN
    v_perc := LEAST((v_qtd_exec / v_qtd_prev) * 100, 100);
  ELSE
    v_perc := 0;
  END IF;

  UPDATE atividades
  SET
    quantidade_exec = v_qtd_exec,
    percentual_exec = v_perc,
    status = CASE
               WHEN v_perc >= 100 THEN 'concluida'::status_atividade
               WHEN v_perc > 0    THEN 'em_andamento'::status_atividade
               ELSE status
             END,
    atualizado_em = NOW()
  WHERE id = NEW.atividade_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_producao_update_atividade
  AFTER INSERT OR UPDATE ON producoes
  FOR EACH ROW EXECUTE FUNCTION fn_update_atividade_percentual();

-- ============================================================
-- FUNÇÃO: bloqueia atividade quando tem impedimento aberto
-- ============================================================
CREATE OR REPLACE FUNCTION fn_bloquear_atividade_impedimento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'aberto' THEN
    UPDATE atividades SET bloqueada = TRUE, atualizado_em = NOW()
    WHERE id = NEW.atividade_id;
  ELSIF NEW.status = 'resolvido' THEN
    -- só desbloqueia se não houver outros impedimentos abertos
    UPDATE atividades SET bloqueada = FALSE, atualizado_em = NOW()
    WHERE id = NEW.atividade_id
      AND NOT EXISTS (
        SELECT 1 FROM impedimentos
        WHERE atividade_id = NEW.atividade_id
          AND status = 'aberto'
          AND id <> NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_impedimento_bloquear
  AFTER INSERT OR UPDATE OF status ON impedimentos
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_atividade_impedimento();

-- ============================================================
-- FUNÇÃO: cria pendência automaticamente ao reprovar inspeção
-- ou ao aprovar com ressalvas
-- ============================================================
CREATE OR REPLACE FUNCTION fn_inspecao_criar_pendencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('reprovada','aprovada_com_ressalvas')
     AND OLD.status = 'aguardando' THEN
    INSERT INTO pendencias (
      inspecao_id, atividade_id, obra_id, construtora_id,
      descricao, status, criado_por
    )
    VALUES (
      NEW.id,
      NEW.atividade_id,
      NEW.obra_id,
      NEW.construtora_id,
      COALESCE(NEW.observacoes, 'Pendência gerada pela inspeção'),
      'criada',
      NEW.inspetor_id
    );

    -- Se reprovada, bloqueia medição da atividade
    IF NEW.status = 'reprovada' THEN
      UPDATE atividades
      SET libera_medicao = FALSE, atualizado_em = NOW()
      WHERE id = NEW.atividade_id;
    END IF;
  END IF;

  -- Se aprovada, libera medição
  IF NEW.status = 'aprovada' AND OLD.status <> 'aprovada' THEN
    UPDATE atividades
    SET libera_medicao = TRUE, atualizado_em = NOW()
    WHERE id = NEW.atividade_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inspecao_pendencia
  AFTER UPDATE OF status ON inspecoes
  FOR EACH ROW EXECUTE FUNCTION fn_inspecao_criar_pendencia();

-- ============================================================
-- FUNÇÃO: gera/atualiza diário de obra automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_gerar_diario_obra(
  p_obra_id UUID,
  p_data    DATE
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_diario_id     UUID;
  v_construtora   UUID;
  v_ef_prev       INTEGER := 0;
  v_ef_pres       INTEGER := 0;
  v_ef_aus        INTEGER := 0;
  v_total_prod    INTEGER := 0;
  v_total_imp     INTEGER := 0;
  v_total_pend    INTEGER := 0;
  v_total_insp    INTEGER := 0;
  v_total_fotos   INTEGER := 0;
BEGIN
  SELECT construtora_id INTO v_construtora FROM obras WHERE id = p_obra_id;

  -- Efetivo
  SELECT
    COUNT(*),
    SUM(CASE WHEN ec.presente THEN 1 ELSE 0 END),
    SUM(CASE WHEN NOT ec.presente THEN 1 ELSE 0 END)
  INTO v_ef_prev, v_ef_pres, v_ef_aus
  FROM efetivo_diario ed
  JOIN efetivo_colaboradores ec ON ec.efetivo_id = ed.id
  WHERE ed.obra_id = p_obra_id AND ed.data = p_data;

  -- Produções
  SELECT COUNT(*) INTO v_total_prod
  FROM producoes WHERE obra_id = p_obra_id AND data = p_data;

  -- Impedimentos abertos
  SELECT COUNT(*) INTO v_total_imp
  FROM impedimentos
  WHERE obra_id = p_obra_id
    AND data_ocorrencia = p_data
    AND status = 'aberto';

  -- Pendências
  SELECT COUNT(*) INTO v_total_pend
  FROM pendencias p
  JOIN atividades a ON a.id = p.atividade_id
  WHERE a.obra_id = p_obra_id
    AND DATE(p.criado_em) = p_data;

  -- Inspeções
  SELECT COUNT(*) INTO v_total_insp
  FROM inspecoes WHERE obra_id = p_obra_id
    AND DATE(data_solicitacao) = p_data;

  -- Fotos
  SELECT COUNT(*) INTO v_total_fotos
  FROM fotos WHERE obra_id = p_obra_id
    AND DATE(criado_em) = p_data;

  -- Upsert do diário
  INSERT INTO diario_obra (
    obra_id, construtora_id, data,
    efetivo_previsto, efetivo_presente, efetivo_ausente,
    total_producoes, total_impedimentos, total_pendencias,
    total_inspecoes, total_fotos, gerado_auto
  )
  VALUES (
    p_obra_id, v_construtora, p_data,
    v_ef_prev, v_ef_pres, v_ef_aus,
    v_total_prod, v_total_imp, v_total_pend,
    v_total_insp, v_total_fotos, TRUE
  )
  ON CONFLICT (obra_id, data) DO UPDATE SET
    efetivo_previsto  = EXCLUDED.efetivo_previsto,
    efetivo_presente  = EXCLUDED.efetivo_presente,
    efetivo_ausente   = EXCLUDED.efetivo_ausente,
    total_producoes   = EXCLUDED.total_producoes,
    total_impedimentos= EXCLUDED.total_impedimentos,
    total_pendencias  = EXCLUDED.total_pendencias,
    total_inspecoes   = EXCLUDED.total_inspecoes,
    total_fotos       = EXCLUDED.total_fotos,
    atualizado_em     = NOW()
  RETURNING id INTO v_diario_id;

  RETURN v_diario_id;
END;
$$;

-- Trigger: regenera diário ao lançar produção
CREATE OR REPLACE FUNCTION fn_trigger_gerar_diario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fn_gerar_diario_obra(NEW.obra_id, NEW.data);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_producao_diario
  AFTER INSERT OR UPDATE ON producoes
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_gerar_diario();

-- ============================================================
-- FUNÇÃO: calcula valor bruto da medição ao fechar
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_medicao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_valor_bruto NUMERIC;
BEGIN
  IF NEW.status = 'fechada' AND OLD.status = 'aberta' THEN
    SELECT COALESCE(SUM(valor_total), 0)
    INTO v_valor_bruto
    FROM banco_medicao
    WHERE medicao_id = NEW.id AND status = 'aprovado';

    NEW.valor_bruto = v_valor_bruto;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_medicao
  BEFORE UPDATE OF status ON medicoes
  FOR EACH ROW EXECUTE FUNCTION fn_calcular_medicao();

-- ============================================================
-- VIEW: dashboard de obra (indicadores consolidados)
-- ============================================================
CREATE OR REPLACE VIEW vw_dashboard_obra AS
SELECT
  o.id                                          AS obra_id,
  o.construtora_id,
  o.nome                                        AS obra_nome,
  o.tipo,
  o.status,
  o.data_inicio,
  o.data_fim_prev,

  -- Atividades
  COUNT(DISTINCT a.id)                          AS total_atividades,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'concluida')   AS atividades_concluidas,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'em_andamento') AS atividades_em_andamento,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'bloqueada')   AS atividades_bloqueadas,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'planejada')   AS atividades_planejadas,
  ROUND(
    CASE WHEN COUNT(a.id) > 0
      THEN AVG(a.percentual_exec) ELSE 0
    END, 2
  )                                              AS percentual_geral,

  -- Efetivo hoje
  COALESCE(ej.efetivo_hoje, 0)                  AS efetivo_hoje,

  -- Impedimentos abertos
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'aberto')      AS impedimentos_abertos,

  -- Inspeções
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'aguardando')          AS inspecoes_aguardando,
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'aprovada')             AS inspecoes_aprovadas,
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'reprovada')            AS inspecoes_reprovadas,

  -- Pendências
  COUNT(DISTINCT p.id) FILTER (WHERE p.status NOT IN ('validada','cancelada')) AS pendencias_abertas

FROM obras o
LEFT JOIN atividades a         ON a.obra_id = o.id
LEFT JOIN impedimentos i       ON i.obra_id = o.id
LEFT JOIN inspecoes insp       ON insp.obra_id = o.id
LEFT JOIN pendencias p         ON p.obra_id = o.id
LEFT JOIN LATERAL (
  SELECT SUM(ep.efetivo_presente) AS efetivo_hoje
  FROM diario_obra ep
  WHERE ep.obra_id = o.id AND ep.data = CURRENT_DATE
) ej ON TRUE
GROUP BY o.id, o.construtora_id, o.nome, o.tipo, o.status,
         o.data_inicio, o.data_fim_prev, ej.efetivo_hoje;

-- ============================================================
-- VIEW: progresso por estrutura (unidade/bloco/setor)
-- ============================================================
CREATE OR REPLACE VIEW vw_progresso_estrutura AS
SELECT
  eo.id                     AS estrutura_id,
  eo.obra_id,
  eo.parent_id,
  eo.tipo,
  eo.nome,
  eo.codigo,
  COUNT(a.id)               AS total_atividades,
  ROUND(COALESCE(AVG(a.percentual_exec), 0), 2) AS percentual_exec,
  SUM(CASE WHEN a.status = 'concluida'    THEN 1 ELSE 0 END) AS concluidas,
  SUM(CASE WHEN a.status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento,
  SUM(CASE WHEN a.status = 'bloqueada'    THEN 1 ELSE 0 END) AS bloqueadas
FROM estrutura_obra eo
LEFT JOIN atividades a ON a.estrutura_id = eo.id
GROUP BY eo.id, eo.obra_id, eo.parent_id, eo.tipo, eo.nome, eo.codigo;

-- ============================================================
-- VIEW: produção por empreiteiro/obra
-- ============================================================
CREATE OR REPLACE VIEW vw_producao_empreiteiro AS
SELECT
  p.obra_id,
  p.empreiteiro_id,
  e.razao_social   AS empreiteiro_nome,
  p.data,
  COUNT(p.id)      AS qtd_lancamentos,
  SUM(p.quantidade) AS total_quantidade,
  p.unidade
FROM producoes p
JOIN empreiteiros e ON e.id = p.empreiteiro_id
GROUP BY p.obra_id, p.empreiteiro_id, e.razao_social, p.data, p.unidade;
