-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 07 - ALMOXARIFADO SIMPLIFICADO E EQUIPAMENTOS
-- ============================================================

-- ============================================================
-- ALMOXARIFADO SIMPLIFICADO
-- Valida disponibilidade de materiais por atividade/data
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
