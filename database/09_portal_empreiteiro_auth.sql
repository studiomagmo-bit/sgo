-- ============================================================
-- SGO – Portal do Empreiteiro: Auth + RLS
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Funções helper para empreiteiros ─────────────────────────

-- Retorna o empreiteiro_id do usuário logado (tabela usuarios_empreiteiro)
CREATE OR REPLACE FUNCTION meu_empreiteiro_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT empreiteiro_id FROM usuarios_empreiteiro
  WHERE id = auth.uid() AND ativo = TRUE
  LIMIT 1;
$$;

-- Verifica se o usuário logado é um empreiteiro (está em usuarios_empreiteiro)
CREATE OR REPLACE FUNCTION is_empreiteiro()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empreiteiro
    WHERE id = auth.uid() AND ativo = TRUE
  );
$$;

-- ─── RLS — USUARIOS_EMPREITEIRO ───────────────────────────────
ALTER TABLE usuarios_empreiteiro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usu_emp_select_own"        ON usuarios_empreiteiro;
DROP POLICY IF EXISTS "usu_emp_select_construtora" ON usuarios_empreiteiro;
DROP POLICY IF EXISTS "usu_emp_insert"             ON usuarios_empreiteiro;
DROP POLICY IF EXISTS "usu_emp_update_own"         ON usuarios_empreiteiro;
DROP POLICY IF EXISTS "usu_emp_superadmin"         ON usuarios_empreiteiro;

-- Empreiteiro vê só seu próprio perfil
CREATE POLICY "usu_emp_select_own" ON usuarios_empreiteiro
  FOR SELECT USING (id = auth.uid());

-- Gestor da construtora vê os empreiteiros da sua construtora
CREATE POLICY "usu_emp_select_construtora" ON usuarios_empreiteiro
  FOR SELECT USING (construtora_id = minha_construtora_id());

-- Gestor pode criar acesso para empreiteiro
CREATE POLICY "usu_emp_insert" ON usuarios_empreiteiro
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

-- Empreiteiro pode atualizar seu próprio perfil
CREATE POLICY "usu_emp_update_own" ON usuarios_empreiteiro
  FOR UPDATE USING (id = auth.uid());

-- Superadmin acesso total
CREATE POLICY "usu_emp_superadmin" ON usuarios_empreiteiro
  FOR ALL USING (is_superadmin());

-- ─── Ajuste RLS atividades: empreiteiro vê suas próprias ──────
-- Precisamos adicionar política para empreiteiros acessarem
-- as atividades vinculadas a eles.

-- Remove política antiga se existir
DROP POLICY IF EXISTS "atividades_empreiteiro" ON atividades;

CREATE POLICY "atividades_empreiteiro" ON atividades
  FOR SELECT USING (
    empreiteiro_id = meu_empreiteiro_id()
  );

DROP POLICY IF EXISTS "atividades_empreiteiro_update" ON atividades;

CREATE POLICY "atividades_empreiteiro_update" ON atividades
  FOR UPDATE USING (
    empreiteiro_id = meu_empreiteiro_id()
  );

-- ─── Ajuste RLS colaboradores: empreiteiro vê/gerencia os seus ──
DROP POLICY IF EXISTS "colaboradores_empreiteiro" ON colaboradores;

CREATE POLICY "colaboradores_empreiteiro" ON colaboradores
  FOR ALL USING (
    empreiteiro_id = meu_empreiteiro_id()
  );

-- ─── Ajuste RLS efetivo_diario: empreiteiro vê/cria os seus ──
DROP POLICY IF EXISTS "efetivos_empreiteiro" ON efetivo_diario;

CREATE POLICY "efetivos_empreiteiro" ON efetivo_diario
  FOR ALL USING (
    empreiteiro_id = meu_empreiteiro_id()
  );

-- ─── Ajuste RLS efetivo_colaboradores via efetivo_diario ──────
DROP POLICY IF EXISTS "efetivo_col_empreiteiro" ON efetivo_colaboradores;

CREATE POLICY "efetivo_col_empreiteiro" ON efetivo_colaboradores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM efetivo_diario ed
      WHERE ed.id = efetivo_colaboradores.efetivo_id
        AND ed.empreiteiro_id = meu_empreiteiro_id()
    )
  );

-- ─── Obras: empreiteiro vê obras onde tem atividades ──────────
-- Não adiciona RLS direto em obras (evita complexidade),
-- mas podemos criar uma view para o portal (opcional):
-- CREATE VIEW minhas_obras AS
--   SELECT DISTINCT o.* FROM obras o
--   JOIN atividades a ON a.obra_id = o.id
--   WHERE a.empreiteiro_id = meu_empreiteiro_id();

-- ─── Verificação ──────────────────────────────────────────────
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'usuarios_empreiteiro'
-- ORDER BY policyname;
