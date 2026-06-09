-- ============================================================
-- SGO – Fix RLS: usuário lê seu próprio perfil
-- Rodar no Supabase SQL Editor
-- ============================================================

-- Garante que RLS está ativo na tabela usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores para recriar limpas
DROP POLICY IF EXISTS "usuarios_self_select"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_self_update"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_construtora_read" ON usuarios;
DROP POLICY IF EXISTS "usuarios_superadmin"       ON usuarios;

-- 1. Todo usuário autenticado pode ler SEU PRÓPRIO registro
--    (necessário para o fetchPerfil no auth context)
CREATE POLICY "usuarios_self_select" ON usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Usuários da mesma construtora podem ver uns aos outros
CREATE POLICY "usuarios_construtora_read" ON usuarios
  FOR SELECT
  USING (
    construtora_id IS NOT NULL
    AND construtora_id = (
      SELECT construtora_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- 3. Superadmin vê TODOS os usuários (necessário para o painel admin)
CREATE POLICY "usuarios_superadmin" ON usuarios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.perfil_sistema = 'superadmin'
    )
  );

-- 4. Usuário pode atualizar seu próprio registro
CREATE POLICY "usuarios_self_update" ON usuarios
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- VERIFICAÇÃO: deve retornar seu registro após rodar o SQL
-- SELECT * FROM usuarios WHERE id = auth.uid();
-- ============================================================
