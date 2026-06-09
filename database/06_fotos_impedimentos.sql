-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 06 - FOTOS E IMPEDIMENTOS
-- ============================================================

-- ============================================================
-- FOTOS
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
  equipamento_id  UUID REFERENCES equipamentos(id) ON DELETE CASCADE,

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
