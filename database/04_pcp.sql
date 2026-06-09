-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 04 - PCP (PLANEJAMENTO DE CURTO PRAZO)
-- ============================================================

-- ============================================================
-- TEMPLATES DE PCP
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
