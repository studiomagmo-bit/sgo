-- ============================================================
-- SGO – Portal do Empreiteiro
-- 1. foto_url em atividades (campo para apontar condições/fotos)
-- 2. RLS para colaboradores
-- 3. RLS para efetivo_colaboradores
-- 4. Correção de nomes de tabela em fix_rls_all_tables.sql
--    (efetivos_diarios → efetivo_diario; diario_obras → diario_obra)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── 1. Campo foto em atividades ──────────────────────────────
ALTER TABLE atividades
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS notas_execucao TEXT;

-- ─── 2. RLS — COLABORADORES ───────────────────────────────────
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colaboradores_select"      ON colaboradores;
DROP POLICY IF EXISTS "colaboradores_insert"      ON colaboradores;
DROP POLICY IF EXISTS "colaboradores_update"      ON colaboradores;
DROP POLICY IF EXISTS "colaboradores_superadmin"  ON colaboradores;

CREATE POLICY "colaboradores_select" ON colaboradores
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "colaboradores_insert" ON colaboradores
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "colaboradores_update" ON colaboradores
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "colaboradores_superadmin" ON colaboradores
  FOR ALL USING (is_superadmin());

-- ─── 3. RLS — EFETIVO_COLABORADORES ──────────────────────────
-- Sem coluna construtora_id direta → acesso via efetivo_diario
ALTER TABLE efetivo_colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "efetivo_col_select"     ON efetivo_colaboradores;
DROP POLICY IF EXISTS "efetivo_col_insert"     ON efetivo_colaboradores;
DROP POLICY IF EXISTS "efetivo_col_update"     ON efetivo_colaboradores;
DROP POLICY IF EXISTS "efetivo_col_superadmin" ON efetivo_colaboradores;

CREATE POLICY "efetivo_col_select" ON efetivo_colaboradores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM efetivo_diario ed
      WHERE ed.id = efetivo_colaboradores.efetivo_id
        AND ed.construtora_id = minha_construtora_id()
    )
  );

CREATE POLICY "efetivo_col_insert" ON efetivo_colaboradores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM efetivo_diario ed
      WHERE ed.id = efetivo_colaboradores.efetivo_id
        AND ed.construtora_id = minha_construtora_id()
    )
  );

CREATE POLICY "efetivo_col_update" ON efetivo_colaboradores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM efetivo_diario ed
      WHERE ed.id = efetivo_colaboradores.efetivo_id
        AND ed.construtora_id = minha_construtora_id()
    )
  );

CREATE POLICY "efetivo_col_superadmin" ON efetivo_colaboradores
  FOR ALL USING (is_superadmin());

-- ─── 4. Corrigir nomes de tabela (se ainda não rodou corretamente) ───
-- O arquivo fix_rls_all_tables.sql usava nomes errados.
-- Rodar as policies com os nomes corretos:

ALTER TABLE efetivo_diario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "efetivos_select"     ON efetivo_diario;
DROP POLICY IF EXISTS "efetivos_insert"     ON efetivo_diario;
DROP POLICY IF EXISTS "efetivos_update"     ON efetivo_diario;
DROP POLICY IF EXISTS "efetivos_superadmin" ON efetivo_diario;

CREATE POLICY "efetivos_select" ON efetivo_diario
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "efetivos_insert" ON efetivo_diario
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "efetivos_update" ON efetivo_diario
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "efetivos_superadmin" ON efetivo_diario
  FOR ALL USING (is_superadmin());

-- Diário de obra (nome correto: diario_obra, sem 's')
ALTER TABLE diario_obra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diario_select"     ON diario_obra;
DROP POLICY IF EXISTS "diario_insert"     ON diario_obra;
DROP POLICY IF EXISTS "diario_superadmin" ON diario_obra;

CREATE POLICY "diario_select" ON diario_obra
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "diario_insert" ON diario_obra
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "diario_superadmin" ON diario_obra
  FOR ALL USING (is_superadmin());

-- ─── 5. RLS — PRODUCOES ───────────────────────────────────────
ALTER TABLE producoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "producoes_select"     ON producoes;
DROP POLICY IF EXISTS "producoes_insert"     ON producoes;
DROP POLICY IF EXISTS "producoes_update"     ON producoes;
DROP POLICY IF EXISTS "producoes_superadmin" ON producoes;

CREATE POLICY "producoes_select" ON producoes
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "producoes_insert" ON producoes
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "producoes_update" ON producoes
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "producoes_superadmin" ON producoes
  FOR ALL USING (is_superadmin());

-- ============================================================
-- VERIFICAÇÃO RÁPIDA:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('colaboradores','efetivo_colaboradores',
--                     'efetivo_diario','diario_obra','producoes','atividades')
-- ORDER BY tablename, policyname;
-- ============================================================
