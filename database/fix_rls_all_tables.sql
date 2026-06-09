-- ============================================================
-- SGO – RLS completo para todas as tabelas operacionais
-- Rodar no Supabase SQL Editor
-- ============================================================
-- Regra geral: usuário só acessa dados da sua construtora
-- Superadmin acessa tudo
-- ============================================================

-- Helper reutilizado: construtora_id do usuário logado
CREATE OR REPLACE FUNCTION minha_construtora_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT construtora_id FROM usuarios WHERE id = auth.uid();
$$;

-- ─── OBRAS ───────────────────────────────────────────────────
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "obras_select"     ON obras;
DROP POLICY IF EXISTS "obras_insert"     ON obras;
DROP POLICY IF EXISTS "obras_update"     ON obras;
DROP POLICY IF EXISTS "obras_superadmin" ON obras;

CREATE POLICY "obras_select" ON obras
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "obras_insert" ON obras
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "obras_update" ON obras
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "obras_superadmin" ON obras
  FOR ALL USING (is_superadmin());

-- ─── ATIVIDADES ───────────────────────────────────────────────
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atividades_select"     ON atividades;
DROP POLICY IF EXISTS "atividades_insert"     ON atividades;
DROP POLICY IF EXISTS "atividades_update"     ON atividades;
DROP POLICY IF EXISTS "atividades_superadmin" ON atividades;

CREATE POLICY "atividades_select" ON atividades
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "atividades_insert" ON atividades
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "atividades_update" ON atividades
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "atividades_superadmin" ON atividades
  FOR ALL USING (is_superadmin());

-- ─── EFETIVOS DIÁRIOS ─────────────────────────────────────────
ALTER TABLE efetivos_diarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "efetivos_select"     ON efetivos_diarios;
DROP POLICY IF EXISTS "efetivos_insert"     ON efetivos_diarios;
DROP POLICY IF EXISTS "efetivos_update"     ON efetivos_diarios;
DROP POLICY IF EXISTS "efetivos_superadmin" ON efetivos_diarios;

CREATE POLICY "efetivos_select" ON efetivos_diarios
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "efetivos_insert" ON efetivos_diarios
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "efetivos_update" ON efetivos_diarios
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "efetivos_superadmin" ON efetivos_diarios
  FOR ALL USING (is_superadmin());

-- ─── PRODUÇÕES ────────────────────────────────────────────────
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

-- ─── INSPEÇÕES ────────────────────────────────────────────────
ALTER TABLE inspecoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspecoes_select"     ON inspecoes;
DROP POLICY IF EXISTS "inspecoes_insert"     ON inspecoes;
DROP POLICY IF EXISTS "inspecoes_update"     ON inspecoes;
DROP POLICY IF EXISTS "inspecoes_superadmin" ON inspecoes;

CREATE POLICY "inspecoes_select" ON inspecoes
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "inspecoes_insert" ON inspecoes
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "inspecoes_update" ON inspecoes
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "inspecoes_superadmin" ON inspecoes
  FOR ALL USING (is_superadmin());

-- ─── PENDÊNCIAS ───────────────────────────────────────────────
ALTER TABLE pendencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pendencias_select"     ON pendencias;
DROP POLICY IF EXISTS "pendencias_insert"     ON pendencias;
DROP POLICY IF EXISTS "pendencias_update"     ON pendencias;
DROP POLICY IF EXISTS "pendencias_superadmin" ON pendencias;

CREATE POLICY "pendencias_select" ON pendencias
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "pendencias_insert" ON pendencias
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "pendencias_update" ON pendencias
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "pendencias_superadmin" ON pendencias
  FOR ALL USING (is_superadmin());

-- ─── MEDIÇÕES ─────────────────────────────────────────────────
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicoes_select"     ON medicoes;
DROP POLICY IF EXISTS "medicoes_insert"     ON medicoes;
DROP POLICY IF EXISTS "medicoes_update"     ON medicoes;
DROP POLICY IF EXISTS "medicoes_superadmin" ON medicoes;

CREATE POLICY "medicoes_select" ON medicoes
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "medicoes_insert" ON medicoes
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "medicoes_update" ON medicoes
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "medicoes_superadmin" ON medicoes
  FOR ALL USING (is_superadmin());

-- ─── EMPREITEIROS ─────────────────────────────────────────────
ALTER TABLE empreiteiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empreiteiros_select"     ON empreiteiros;
DROP POLICY IF EXISTS "empreiteiros_insert"     ON empreiteiros;
DROP POLICY IF EXISTS "empreiteiros_update"     ON empreiteiros;
DROP POLICY IF EXISTS "empreiteiros_superadmin" ON empreiteiros;

CREATE POLICY "empreiteiros_select" ON empreiteiros
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "empreiteiros_insert" ON empreiteiros
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "empreiteiros_update" ON empreiteiros
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "empreiteiros_superadmin" ON empreiteiros
  FOR ALL USING (is_superadmin());

-- ─── EQUIPAMENTOS ─────────────────────────────────────────────
ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipamentos_select"     ON equipamentos;
DROP POLICY IF EXISTS "equipamentos_insert"     ON equipamentos;
DROP POLICY IF EXISTS "equipamentos_update"     ON equipamentos;
DROP POLICY IF EXISTS "equipamentos_superadmin" ON equipamentos;

CREATE POLICY "equipamentos_select" ON equipamentos
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "equipamentos_insert" ON equipamentos
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "equipamentos_update" ON equipamentos
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "equipamentos_superadmin" ON equipamentos
  FOR ALL USING (is_superadmin());

-- ─── DIÁRIO DE OBRAS ──────────────────────────────────────────
ALTER TABLE diario_obras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diario_select"     ON diario_obras;
DROP POLICY IF EXISTS "diario_insert"     ON diario_obras;
DROP POLICY IF EXISTS "diario_superadmin" ON diario_obras;

CREATE POLICY "diario_select" ON diario_obras
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "diario_insert" ON diario_obras
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "diario_superadmin" ON diario_obras
  FOR ALL USING (is_superadmin());

-- ─── CONSTRUTORAS ─────────────────────────────────────────────
ALTER TABLE construtoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "construtoras_self_select" ON construtoras;
DROP POLICY IF EXISTS "construtoras_superadmin"  ON construtoras;

-- Usuário vê sua própria construtora
CREATE POLICY "construtoras_self_select" ON construtoras
  FOR SELECT USING (id = minha_construtora_id());

-- Superadmin gerencia todas
CREATE POLICY "construtoras_superadmin" ON construtoras
  FOR ALL USING (is_superadmin());

-- ============================================================
-- VERIFICAÇÃO RÁPIDA (rode após aplicar):
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
-- ============================================================
