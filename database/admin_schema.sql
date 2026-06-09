-- ============================================================
-- SGO – Admin Schema (rodar no Supabase SQL Editor)
-- ============================================================

-- 1. Tabela de Planos
-- ============================================================
CREATE TABLE IF NOT EXISTS planos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  max_obras       INT  NOT NULL DEFAULT 5,   -- -1 = ilimitado
  max_usuarios    INT  NOT NULL DEFAULT 10,
  max_colaboradores INT NOT NULL DEFAULT 50,
  preco_mensal    NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Planos padrão
INSERT INTO planos (nome, descricao, max_obras, max_usuarios, max_colaboradores, preco_mensal) VALUES
  ('Starter',    'Ideal para pequenas construtoras',    3,  5,  20,    0),
  ('Pro',        'Para construtoras em crescimento',   10, 15, 100,  297),
  ('Business',   'Para médias construtoras',           25, 30, 300,  697),
  ('Enterprise', 'Sem limites, suporte dedicado',      -1, -1,  -1, 1497)
ON CONFLICT DO NOTHING;

-- 2. Colunas extras em construtoras
-- ============================================================
ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS plano_id       UUID REFERENCES planos(id);
ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS telefone        TEXT;
ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS email           TEXT;
ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS observacoes     TEXT;
ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS trial_ate       DATE;
ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Campo perfil_sistema em usuarios (superadmin | user)
-- ============================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_sistema TEXT NOT NULL DEFAULT 'user'
  CHECK (perfil_sistema IN ('superadmin', 'user'));

-- 4. Tabela de Convites
-- ============================================================
CREATE TABLE IF NOT EXISTS convites (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  nome           TEXT,
  perfil         perfil_construtora NOT NULL DEFAULT 'engenheiro',
  token          UUID NOT NULL DEFAULT uuid_generate_v4(),
  status         TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente','aceito','expirado','cancelado')),
  criado_por     UUID REFERENCES auth.users(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  aceito_em      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_convites_token    ON convites(token);
CREATE        INDEX IF NOT EXISTS idx_convites_email    ON convites(email);
CREATE        INDEX IF NOT EXISTS idx_convites_construtora ON convites(construtora_id);

-- 5. RLS – Planos (leitura pública)
-- ============================================================
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_read_all"   ON planos;
DROP POLICY IF EXISTS "planos_superadmin" ON planos;

CREATE POLICY "planos_read_all" ON planos
  FOR SELECT USING (true);

CREATE POLICY "planos_superadmin" ON planos
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.perfil_sistema = 'superadmin'
    )
  );

-- 6. RLS – Convites
-- ============================================================
ALTER TABLE convites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convites_superadmin"  ON convites;
DROP POLICY IF EXISTS "convites_token_read"  ON convites;

-- Superadmin gerencia todos os convites
CREATE POLICY "convites_superadmin" ON convites
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.perfil_sistema = 'superadmin'
    )
  );

-- Leitura pública por token (para aceitar convite sem login)
CREATE POLICY "convites_token_read" ON convites
  FOR SELECT
  USING (status = 'pendente' AND expira_em > NOW());

-- 7. RLS – Construtoras (superadmin vê todas)
-- ============================================================
DROP POLICY IF EXISTS "construtoras_superadmin" ON construtoras;

CREATE POLICY "construtoras_superadmin" ON construtoras
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.perfil_sistema = 'superadmin'
    )
  );

-- 8. Função helper: is_superadmin()
-- ============================================================
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil_sistema = 'superadmin'
  );
$$;

-- ============================================================
-- COMO TORNAR UM USUÁRIO SUPERADMIN:
-- UPDATE usuarios SET perfil_sistema = 'superadmin' WHERE email = 'seu@email.com';
-- ============================================================
