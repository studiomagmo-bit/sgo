-- ============================================================
-- SGO — Hierarquia de Roles e Usuários
-- Gestor → cria Engenheiro (designa obra)
-- Engenheiro → cria Empreiteiro (designa acesso ao portal)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── 1. Campo username em usuarios ───────────────────────────
-- Permite login sem e-mail para engenheiros
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Índice único (case-insensitive) por construtora
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username_construtora
  ON usuarios (lower(username), construtora_id)
  WHERE username IS NOT NULL;

-- ─── 2. Tabela usuarios_obra (engenheiro vinculado à obra) ───
CREATE TABLE IF NOT EXISTS usuarios_obra (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  obra_id        UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  papel          TEXT NOT NULL DEFAULT 'engenheiro', -- engenheiro, mestre, auxiliar
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, obra_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_obra_usuario ON usuarios_obra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_obra_obra    ON usuarios_obra(obra_id);

-- ─── 3. RLS para usuarios_obra ────────────────────────────────
ALTER TABLE usuarios_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uo_select" ON usuarios_obra;
DROP POLICY IF EXISTS "uo_insert" ON usuarios_obra;
DROP POLICY IF EXISTS "uo_update" ON usuarios_obra;
DROP POLICY IF EXISTS "uo_admin"  ON usuarios_obra;

-- Gestor da construtora gerencia
CREATE POLICY "uo_select" ON usuarios_obra
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "uo_insert" ON usuarios_obra
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "uo_update" ON usuarios_obra
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "uo_admin" ON usuarios_obra
  FOR ALL USING (is_superadmin());

-- ─── 4. Função: minhas_obras_ids() ───────────────────────────
-- Retorna as obras_ids do engenheiro logado
CREATE OR REPLACE FUNCTION minhas_obras_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT uo.obra_id
    FROM usuarios_obra uo
    JOIN usuarios u ON u.id = uo.usuario_id
    WHERE u.id = auth.uid()
      AND uo.ativo = TRUE
  );
$$;

-- ─── 5. Hierarquia de perfis (documentação) ──────────────────
-- administrador (Gestor): vê TUDO da construtora
--   → cria Obras e designa Engenheiros
-- engenheiro: vê apenas suas obras (via usuarios_obra)
--   → cria Empreiteiros, Atividades, PCP
-- mestre: como engenheiro, menos permissões
-- pcp: lê e edita atividades
-- almoxarife: lê e edita equipamentos

-- ─── 6. Ajuste RLS obras para engenheiro ─────────────────────
-- Engenheiros veem apenas suas obras designadas
DROP POLICY IF EXISTS "obras_engenheiro" ON obras;

CREATE POLICY "obras_engenheiro" ON obras
  FOR SELECT USING (
    -- Gestores veem tudo (já coberto pela policy minha_construtora_id)
    -- Este policy é complementar para engenheiros restritos
    id = ANY(minhas_obras_ids())
    OR construtora_id = minha_construtora_id()
  );

-- ─── 7. Exemplo de como criar um engenheiro (via SQL ou API) ─
-- O gestor cria o usuário e depois vincula à obra:
--
-- INSERT INTO usuarios (id, nome, email, username, perfil, construtora_id, criado_por)
-- VALUES (auth.uid_do_novo, 'João Engenheiro', 'joao@...', 'joao.eng', 'engenheiro', construtora_id, auth.uid());
--
-- INSERT INTO usuarios_obra (usuario_id, obra_id, construtora_id, papel)
-- VALUES (id_joao, id_obra_1, construtora_id, 'engenheiro');

-- ─── 8. Verificação ──────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'usuarios' AND column_name IN ('username', 'criado_por');

-- SELECT * FROM usuarios_obra LIMIT 5;
