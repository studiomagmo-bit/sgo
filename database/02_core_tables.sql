-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 02 - TABELAS CORE (Master, Construtoras, Usuários)
-- ============================================================

-- ============================================================
-- MASTER
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
