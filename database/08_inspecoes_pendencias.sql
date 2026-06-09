-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 08 - INSPEÇÕES E PENDÊNCIAS
-- ============================================================

-- ============================================================
-- INSPEÇÕES
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
