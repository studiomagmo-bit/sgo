-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 09 - CONTRATOS E MEDIÇÕES
-- ============================================================

-- ============================================================
-- CONTRATOS (empreiteiro ↔ obra)
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
