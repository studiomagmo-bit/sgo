-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 10 - DIÁRIO DE OBRA
-- ============================================================

-- ============================================================
-- DIÁRIO DE OBRA (gerado automaticamente por data/obra)
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
