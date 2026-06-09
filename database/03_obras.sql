-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 03 - OBRAS E ESTRUTURA UNIVERSAL
-- ============================================================

-- ============================================================
-- OBRAS
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
