-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 11 - ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ============================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================
ALTER TABLE master                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE construtoras              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE empreiteiros              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empreiteiro      ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_empreiteiros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE estrutura_obra            ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico_materiais         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcp_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcp_template_itens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_dependencias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE efetivo_diario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE efetivo_colaboradores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE producoes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_individual       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE impedimentos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE almoxarifado_validacoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_alocacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_manutencoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspecoes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendencias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_itens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_medicao             ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_obra               ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_atividades         ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_ocorrencias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_equipe             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcp_template_aplicacoes   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna construtora_id do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION get_construtora_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT construtora_id FROM usuarios WHERE id = auth.uid()
  UNION ALL
  SELECT construtora_id FROM usuarios_empreiteiro WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna empreiteiro_id do usuário logado
-- (apenas para usuários do tipo empreiteiro)
-- ============================================================
CREATE OR REPLACE FUNCTION get_empreiteiro_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT empreiteiro_id FROM usuarios_empreiteiro WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna perfil do usuário logado (construtora)
-- ============================================================
CREATE OR REPLACE FUNCTION get_perfil_construtora()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT perfil::TEXT FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: verifica se é usuário da construtora
-- ============================================================
CREATE OR REPLACE FUNCTION is_construtora_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid());
$$;

-- ============================================================
-- FUNÇÃO AUXILIAR: verifica se é administrador
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil = 'administrador'
  );
$$;

-- ============================================================
-- POLÍTICAS: CONSTRUTORAS
-- ============================================================
CREATE POLICY "construtoras_select"
  ON construtoras FOR SELECT
  USING (id = get_construtora_id());

CREATE POLICY "construtoras_manage"
  ON construtoras FOR ALL
  USING (id = get_construtora_id() AND is_admin());

-- ============================================================
-- POLÍTICAS: USUÁRIOS
-- ============================================================
CREATE POLICY "usuarios_select"
  ON usuarios FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "usuarios_manage"
  ON usuarios FOR ALL
  USING (construtora_id = get_construtora_id() AND is_admin());

CREATE POLICY "usuarios_self"
  ON usuarios FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- POLÍTICAS: EMPREITEIROS
-- ============================================================
CREATE POLICY "empreiteiros_select"
  ON empreiteiros FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "empreiteiros_manage"
  ON empreiteiros FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: COLABORADORES
-- ============================================================
CREATE POLICY "colaboradores_select"
  ON colaboradores FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "colaboradores_manage"
  ON colaboradores FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND (
      get_perfil_construtora() IN ('administrador','gerente','mestre')
      OR empreiteiro_id = get_empreiteiro_id()
    )
  );

-- ============================================================
-- POLÍTICAS: OBRAS
-- ============================================================
CREATE POLICY "obras_select"
  ON obras FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "obras_manage"
  ON obras FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: ESTRUTURA OBRA
-- ============================================================
CREATE POLICY "estrutura_obra_select"
  ON estrutura_obra FOR SELECT
  USING (
    obra_id IN (SELECT id FROM obras WHERE construtora_id = get_construtora_id())
  );

CREATE POLICY "estrutura_obra_manage"
  ON estrutura_obra FOR ALL
  USING (
    obra_id IN (SELECT id FROM obras WHERE construtora_id = get_construtora_id())
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','pcp')
  );

-- ============================================================
-- POLÍTICAS: SERVIÇOS
-- ============================================================
CREATE POLICY "servicos_select"
  ON servicos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "servicos_manage"
  ON servicos FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','pcp')
  );

-- ============================================================
-- POLÍTICAS: ATIVIDADES
-- ============================================================
CREATE POLICY "atividades_select"
  ON atividades FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "atividades_manage"
  ON atividades FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','pcp','mestre')
  );

-- ============================================================
-- POLÍTICAS: PRODUÇÕES (construtora vê tudo; encarregado só da sua equipe)
-- ============================================================
CREATE POLICY "producoes_select_construtora"
  ON producoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "producoes_select_empreiteiro"
  ON producoes FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "producoes_insert_encarregado"
  ON producoes FOR INSERT
  WITH CHECK (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "producoes_manage_construtora"
  ON producoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','mestre')
  );

-- ============================================================
-- POLÍTICAS: EFETIVO DIÁRIO
-- ============================================================
CREATE POLICY "efetivo_select_construtora"
  ON efetivo_diario FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "efetivo_select_empreiteiro"
  ON efetivo_diario FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "efetivo_manage_construtora"
  ON efetivo_diario FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','mestre')
  );

CREATE POLICY "efetivo_manage_empreiteiro"
  ON efetivo_diario FOR INSERT
  WITH CHECK (empreiteiro_id = get_empreiteiro_id());

-- ============================================================
-- POLÍTICAS: FOTOS
-- ============================================================
CREATE POLICY "fotos_select"
  ON fotos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "fotos_insert"
  ON fotos FOR INSERT
  WITH CHECK (construtora_id = get_construtora_id());

CREATE POLICY "fotos_delete"
  ON fotos FOR DELETE
  USING (
    construtora_id = get_construtora_id()
    AND (criado_por = auth.uid() OR is_admin())
  );

-- ============================================================
-- POLÍTICAS: IMPEDIMENTOS
-- ============================================================
CREATE POLICY "impedimentos_select"
  ON impedimentos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "impedimentos_manage"
  ON impedimentos FOR ALL
  USING (construtora_id = get_construtora_id());

-- ============================================================
-- POLÍTICAS: INSPEÇÕES
-- ============================================================
CREATE POLICY "inspecoes_select"
  ON inspecoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "inspecoes_manage"
  ON inspecoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro')
  );

-- ============================================================
-- POLÍTICAS: PENDÊNCIAS
-- ============================================================
CREATE POLICY "pendencias_select"
  ON pendencias FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "pendencias_manage"
  ON pendencias FOR ALL
  USING (construtora_id = get_construtora_id());

-- ============================================================
-- POLÍTICAS: CONTRATOS (empreiteiro vê apenas o seu)
-- ============================================================
CREATE POLICY "contratos_select_construtora"
  ON contratos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "contratos_select_empreiteiro"
  ON contratos FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "contratos_manage"
  ON contratos FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: MEDIÇÕES (empreiteiro vê; construtora gerencia)
-- ============================================================
CREATE POLICY "medicoes_select_construtora"
  ON medicoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "medicoes_select_empreiteiro"
  ON medicoes FOR SELECT
  USING (empreiteiro_id = get_empreiteiro_id());

CREATE POLICY "medicoes_manage"
  ON medicoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro')
  );

-- ============================================================
-- POLÍTICAS: EQUIPAMENTOS
-- ============================================================
CREATE POLICY "equipamentos_select"
  ON equipamentos FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "equipamentos_manage"
  ON equipamentos FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ============================================================
-- POLÍTICAS: DIÁRIO DE OBRA
-- ============================================================
CREATE POLICY "diario_select"
  ON diario_obra FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "diario_manage"
  ON diario_obra FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','engenheiro','mestre')
  );

-- ============================================================
-- POLÍTICAS: ALMOXARIFADO
-- ============================================================
CREATE POLICY "almox_select"
  ON almoxarifado_validacoes FOR SELECT
  USING (construtora_id = get_construtora_id());

CREATE POLICY "almox_manage"
  ON almoxarifado_validacoes FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente','almoxarife','engenheiro')
  );
