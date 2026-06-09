-- ============================================================
-- SGO – Fix RLS: usuário lê seu próprio perfil (SEM recursão)
-- Rodar no Supabase SQL Editor
-- ============================================================
-- PROBLEMA ANTERIOR: as policies consultavam SELECT FROM usuarios
-- dentro de uma policy de usuarios → infinite_recursion
-- SOLUÇÃO: usar funções SECURITY DEFINER que bypassam RLS
-- ============================================================

-- Garante que as funções SECURITY DEFINER existem
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil_sistema = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION minha_construtora_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT construtora_id FROM usuarios WHERE id = auth.uid();
$$;

-- RLS ativa
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (inclusive as com recursão)
DROP POLICY IF EXISTS "usuarios_self_select"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_self_update"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_construtora_read" ON usuarios;
DROP POLICY IF EXISTS "usuarios_superadmin"       ON usuarios;

-- 1. Usuário lê SEU PRÓPRIO registro (sem subquery → sem recursão)
CREATE POLICY "usuarios_self_select" ON usuarios
  FOR SELECT USING (auth.uid() = id);

-- 2. Usuários da mesma construtora se veem
--    Usa minha_construtora_id() SECURITY DEFINER → sem recursão
CREATE POLICY "usuarios_construtora_read" ON usuarios
  FOR SELECT USING (
    construtora_id IS NOT NULL
    AND construtora_id = minha_construtora_id()
  );

-- 3. Superadmin vê todos
--    Usa is_superadmin() SECURITY DEFINER → sem recursão
CREATE POLICY "usuarios_superadmin" ON usuarios
  FOR ALL USING (is_superadmin());

-- 4. Usuário atualiza seu próprio registro
CREATE POLICY "usuarios_self_update" ON usuarios
  FOR UPDATE USING (auth.uid() = id);
