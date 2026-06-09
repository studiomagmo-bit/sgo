-- ============================================================
-- SGO – RLS para estrutura_obra
-- Rodar no Supabase SQL Editor
-- ============================================================

ALTER TABLE estrutura_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estrutura_select"     ON estrutura_obra;
DROP POLICY IF EXISTS "estrutura_insert"     ON estrutura_obra;
DROP POLICY IF EXISTS "estrutura_update"     ON estrutura_obra;
DROP POLICY IF EXISTS "estrutura_delete"     ON estrutura_obra;
DROP POLICY IF EXISTS "estrutura_superadmin" ON estrutura_obra;

-- Usuário vê estruturas da sua construtora (via obra)
CREATE POLICY "estrutura_select" ON estrutura_obra
  FOR SELECT USING (
    obra_id IN (
      SELECT id FROM obras WHERE construtora_id = minha_construtora_id()
    )
  );

-- Usuário cria estruturas em obras da sua construtora
CREATE POLICY "estrutura_insert" ON estrutura_obra
  FOR INSERT WITH CHECK (
    obra_id IN (
      SELECT id FROM obras WHERE construtora_id = minha_construtora_id()
    )
  );

-- Usuário atualiza estruturas da sua construtora
CREATE POLICY "estrutura_update" ON estrutura_obra
  FOR UPDATE USING (
    obra_id IN (
      SELECT id FROM obras WHERE construtora_id = minha_construtora_id()
    )
  );

-- Usuário exclui estruturas da sua construtora
CREATE POLICY "estrutura_delete" ON estrutura_obra
  FOR DELETE USING (
    obra_id IN (
      SELECT id FROM obras WHERE construtora_id = minha_construtora_id()
    )
  );

-- Superadmin gerencia tudo
CREATE POLICY "estrutura_superadmin" ON estrutura_obra
  FOR ALL USING (is_superadmin());
