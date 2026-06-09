-- ============================================================
-- SGO — 10_roles_e_usuarios.sql
-- Hierarquia: Gestor → Engenheiro → Empreiteiro
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── 1. Campos extras em usuarios ────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS username     TEXT,
  ADD COLUMN IF NOT EXISTS criado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Username único por construtora (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username_construtora
  ON usuarios (lower(username), construtora_id)
  WHERE username IS NOT NULL;

-- ─── 2. Tabela: usuarios_obra ─────────────────────────────────
-- Vincula engenheiro/mestre a uma obra específica
CREATE TABLE IF NOT EXISTS usuarios_obra (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id)    ON DELETE CASCADE,
  obra_id        UUID NOT NULL REFERENCES obras(id)       ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  papel          TEXT NOT NULL DEFAULT 'engenheiro',
  -- 'engenheiro' | 'mestre' | 'auxiliar' | 'pcp'
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, obra_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_obra_usuario ON usuarios_obra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_obra_obra    ON usuarios_obra(obra_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_obra_cid     ON usuarios_obra(construtora_id);

-- ─── 3. RLS — usuarios_obra ───────────────────────────────────
ALTER TABLE usuarios_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uo_select"     ON usuarios_obra;
DROP POLICY IF EXISTS "uo_insert"     ON usuarios_obra;
DROP POLICY IF EXISTS "uo_update"     ON usuarios_obra;
DROP POLICY IF EXISTS "uo_delete"     ON usuarios_obra;
DROP POLICY IF EXISTS "uo_superadmin" ON usuarios_obra;

CREATE POLICY "uo_select" ON usuarios_obra
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "uo_insert" ON usuarios_obra
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "uo_update" ON usuarios_obra
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "uo_delete" ON usuarios_obra
  FOR DELETE USING (construtora_id = minha_construtora_id());

CREATE POLICY "uo_superadmin" ON usuarios_obra
  FOR ALL USING (is_superadmin());

-- ─── 4. Função: minhas_obras_ids() ───────────────────────────
-- Retorna IDs das obras vinculadas ao usuário logado
CREATE OR REPLACE FUNCTION minhas_obras_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT uo.obra_id
    FROM usuarios_obra uo
    WHERE uo.usuario_id = auth.uid()
      AND uo.ativo = TRUE
  );
$$;

-- ─── 5. Função: meu_perfil() ─────────────────────────────────
CREATE OR REPLACE FUNCTION meu_perfil()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT perfil::TEXT FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ─── 6. RLS obras — acesso restrito por papel ─────────────────
-- Gestores (administrador/gerente): veem todas as obras da construtora
-- Engenheiros/Mestres: veem apenas suas obras designadas
DROP POLICY IF EXISTS "obras_select" ON obras;

CREATE POLICY "obras_select" ON obras
  FOR SELECT USING (
    construtora_id = minha_construtora_id()
    AND (
      meu_perfil() IN ('administrador', 'gerente', 'pcp', 'almoxarife')
      OR id = ANY(minhas_obras_ids())
    )
  );

-- ─── 7. RLS usuarios — gestor gerencia usuários da construtora ─
-- Já existe policy via fix_usuarios_rls.sql
-- Adicionamos policy para inserção de novos usuários pelo gestor:

DROP POLICY IF EXISTS "usuarios_insert_gestor" ON usuarios;

CREATE POLICY "usuarios_insert_gestor" ON usuarios
  FOR INSERT WITH CHECK (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );

DROP POLICY IF EXISTS "usuarios_update_gestor" ON usuarios;

CREATE POLICY "usuarios_update_gestor" ON usuarios
  FOR UPDATE USING (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );

-- ─── 8. Resumo das regras de acesso ──────────────────────────
-- perfil          | obras visíveis          | pode criar usuários
-- ────────────────────────────────────────────────────────────
-- administrador   | todas da construtora    | SIM (engenheiros)
-- gerente         | todas da construtora    | SIM
-- engenheiro      | apenas as designadas    | NÃO (só empreiteiros)
-- mestre          | apenas as designadas    | NÃO
-- pcp             | todas da construtora    | NÃO
-- almoxarife      | todas da construtora    | NÃO
-- superadmin      | tudo                   | SIM

-- ─── 9. Trigger para criar usuário (criado pelo gestor) ───────
-- NOTA: Para criar um usuário sem email (apenas username + senha),
-- o gestor usa a função criarUsuarioInterno() que gera um email
-- interno como: {username}@{construtora_slug}.sgo.internal
-- Isso permite login via email+senha no Supabase Auth,
-- mas o sistema só exibe o username para o engenheiro.

-- ─── 10. Verificação ─────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'usuarios'
-- ORDER BY ordinal_position;

-- SELECT * FROM usuarios_obra LIMIT 5;

-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('usuarios', 'obras', 'usuarios_obra')
-- ORDER BY tablename, policyname;
