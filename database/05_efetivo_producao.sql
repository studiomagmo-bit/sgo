-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 05 - EFETIVO DIÁRIO E PRODUÇÃO
-- ============================================================

-- ============================================================
-- EFETIVO DIÁRIO (registro do dia por equipe/empreiteiro)
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
