-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 12 - TRIGGERS, FUNCTIONS E VIEWS
-- ============================================================

-- ============================================================
-- FUNÇÃO GENÉRICA: atualiza coluna atualizado_em
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar trigger em todas as tabelas com atualizado_em
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'master','construtoras','usuarios','empreiteiros',
    'usuarios_empreiteiro','colaboradores','obras',
    'estrutura_obra','servicos','pcp_templates',
    'atividades','efetivo_diario','producoes',
    'almoxarifado_validacoes','equipamentos',
    'equipamento_alocacoes','equipamento_manutencoes',
    'inspecoes','pendencias','contratos','contrato_itens',
    'medicoes','banco_medicao','diario_obra'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- FUNÇÃO: cria usuário na tabela usuarios ao registrar no Auth
-- ============================================================
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO usuarios (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================
-- FUNÇÃO: atualiza percentual_exec da atividade após produção
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_atividade_percentual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_qtd_prev  NUMERIC;
  v_qtd_exec  NUMERIC;
  v_perc      NUMERIC;
BEGIN
  SELECT quantidade_prev INTO v_qtd_prev
  FROM atividades WHERE id = NEW.atividade_id;

  SELECT COALESCE(SUM(quantidade), 0) INTO v_qtd_exec
  FROM producoes WHERE atividade_id = NEW.atividade_id;

  IF v_qtd_prev > 0 THEN
    v_perc := LEAST((v_qtd_exec / v_qtd_prev) * 100, 100);
  ELSE
    v_perc := 0;
  END IF;

  UPDATE atividades
  SET
    quantidade_exec = v_qtd_exec,
    percentual_exec = v_perc,
    status = CASE
               WHEN v_perc >= 100 THEN 'concluida'::status_atividade
               WHEN v_perc > 0    THEN 'em_andamento'::status_atividade
               ELSE status
             END,
    atualizado_em = NOW()
  WHERE id = NEW.atividade_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_producao_update_atividade
  AFTER INSERT OR UPDATE ON producoes
  FOR EACH ROW EXECUTE FUNCTION fn_update_atividade_percentual();

-- ============================================================
-- FUNÇÃO: bloqueia atividade quando tem impedimento aberto
-- ============================================================
CREATE OR REPLACE FUNCTION fn_bloquear_atividade_impedimento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'aberto' THEN
    UPDATE atividades SET bloqueada = TRUE, atualizado_em = NOW()
    WHERE id = NEW.atividade_id;
  ELSIF NEW.status = 'resolvido' THEN
    -- só desbloqueia se não houver outros impedimentos abertos
    UPDATE atividades SET bloqueada = FALSE, atualizado_em = NOW()
    WHERE id = NEW.atividade_id
      AND NOT EXISTS (
        SELECT 1 FROM impedimentos
        WHERE atividade_id = NEW.atividade_id
          AND status = 'aberto'
          AND id <> NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_impedimento_bloquear
  AFTER INSERT OR UPDATE OF status ON impedimentos
  FOR EACH ROW EXECUTE FUNCTION fn_bloquear_atividade_impedimento();

-- ============================================================
-- FUNÇÃO: cria pendência automaticamente ao reprovar inspeção
-- ou ao aprovar com ressalvas
-- ============================================================
CREATE OR REPLACE FUNCTION fn_inspecao_criar_pendencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('reprovada','aprovada_com_ressalvas')
     AND OLD.status = 'aguardando' THEN
    INSERT INTO pendencias (
      inspecao_id, atividade_id, obra_id, construtora_id,
      descricao, status, criado_por
    )
    VALUES (
      NEW.id,
      NEW.atividade_id,
      NEW.obra_id,
      NEW.construtora_id,
      COALESCE(NEW.observacoes, 'Pendência gerada pela inspeção'),
      'criada',
      NEW.inspetor_id
    );

    -- Se reprovada, bloqueia medição da atividade
    IF NEW.status = 'reprovada' THEN
      UPDATE atividades
      SET libera_medicao = FALSE, atualizado_em = NOW()
      WHERE id = NEW.atividade_id;
    END IF;
  END IF;

  -- Se aprovada, libera medição
  IF NEW.status = 'aprovada' AND OLD.status <> 'aprovada' THEN
    UPDATE atividades
    SET libera_medicao = TRUE, atualizado_em = NOW()
    WHERE id = NEW.atividade_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inspecao_pendencia
  AFTER UPDATE OF status ON inspecoes
  FOR EACH ROW EXECUTE FUNCTION fn_inspecao_criar_pendencia();

-- ============================================================
-- FUNÇÃO: gera/atualiza diário de obra automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION fn_gerar_diario_obra(
  p_obra_id UUID,
  p_data    DATE
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_diario_id     UUID;
  v_construtora   UUID;
  v_ef_prev       INTEGER := 0;
  v_ef_pres       INTEGER := 0;
  v_ef_aus        INTEGER := 0;
  v_total_prod    INTEGER := 0;
  v_total_imp     INTEGER := 0;
  v_total_pend    INTEGER := 0;
  v_total_insp    INTEGER := 0;
  v_total_fotos   INTEGER := 0;
BEGIN
  SELECT construtora_id INTO v_construtora FROM obras WHERE id = p_obra_id;

  -- Efetivo
  SELECT
    COUNT(*),
    SUM(CASE WHEN ec.presente THEN 1 ELSE 0 END),
    SUM(CASE WHEN NOT ec.presente THEN 1 ELSE 0 END)
  INTO v_ef_prev, v_ef_pres, v_ef_aus
  FROM efetivo_diario ed
  JOIN efetivo_colaboradores ec ON ec.efetivo_id = ed.id
  WHERE ed.obra_id = p_obra_id AND ed.data = p_data;

  -- Produções
  SELECT COUNT(*) INTO v_total_prod
  FROM producoes WHERE obra_id = p_obra_id AND data = p_data;

  -- Impedimentos abertos
  SELECT COUNT(*) INTO v_total_imp
  FROM impedimentos
  WHERE obra_id = p_obra_id
    AND data_ocorrencia = p_data
    AND status = 'aberto';

  -- Pendências
  SELECT COUNT(*) INTO v_total_pend
  FROM pendencias p
  JOIN atividades a ON a.id = p.atividade_id
  WHERE a.obra_id = p_obra_id
    AND DATE(p.criado_em) = p_data;

  -- Inspeções
  SELECT COUNT(*) INTO v_total_insp
  FROM inspecoes WHERE obra_id = p_obra_id
    AND DATE(data_solicitacao) = p_data;

  -- Fotos
  SELECT COUNT(*) INTO v_total_fotos
  FROM fotos WHERE obra_id = p_obra_id
    AND DATE(criado_em) = p_data;

  -- Upsert do diário
  INSERT INTO diario_obra (
    obra_id, construtora_id, data,
    efetivo_previsto, efetivo_presente, efetivo_ausente,
    total_producoes, total_impedimentos, total_pendencias,
    total_inspecoes, total_fotos, gerado_auto
  )
  VALUES (
    p_obra_id, v_construtora, p_data,
    v_ef_prev, v_ef_pres, v_ef_aus,
    v_total_prod, v_total_imp, v_total_pend,
    v_total_insp, v_total_fotos, TRUE
  )
  ON CONFLICT (obra_id, data) DO UPDATE SET
    efetivo_previsto  = EXCLUDED.efetivo_previsto,
    efetivo_presente  = EXCLUDED.efetivo_presente,
    efetivo_ausente   = EXCLUDED.efetivo_ausente,
    total_producoes   = EXCLUDED.total_producoes,
    total_impedimentos= EXCLUDED.total_impedimentos,
    total_pendencias  = EXCLUDED.total_pendencias,
    total_inspecoes   = EXCLUDED.total_inspecoes,
    total_fotos       = EXCLUDED.total_fotos,
    atualizado_em     = NOW()
  RETURNING id INTO v_diario_id;

  RETURN v_diario_id;
END;
$$;

-- Trigger: regenera diário ao lançar produção
CREATE OR REPLACE FUNCTION fn_trigger_gerar_diario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fn_gerar_diario_obra(NEW.obra_id, NEW.data);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_producao_diario
  AFTER INSERT OR UPDATE ON producoes
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_gerar_diario();

-- ============================================================
-- FUNÇÃO: calcula valor bruto da medição ao fechar
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_medicao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_valor_bruto NUMERIC;
BEGIN
  IF NEW.status = 'fechada' AND OLD.status = 'aberta' THEN
    SELECT COALESCE(SUM(valor_total), 0)
    INTO v_valor_bruto
    FROM banco_medicao
    WHERE medicao_id = NEW.id AND status = 'aprovado';

    NEW.valor_bruto = v_valor_bruto;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_medicao
  BEFORE UPDATE OF status ON medicoes
  FOR EACH ROW EXECUTE FUNCTION fn_calcular_medicao();

-- ============================================================
-- VIEW: dashboard de obra (indicadores consolidados)
-- ============================================================
CREATE OR REPLACE VIEW vw_dashboard_obra AS
SELECT
  o.id                                          AS obra_id,
  o.construtora_id,
  o.nome                                        AS obra_nome,
  o.tipo,
  o.status,
  o.data_inicio,
  o.data_fim_prev,

  -- Atividades
  COUNT(DISTINCT a.id)                          AS total_atividades,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'concluida')   AS atividades_concluidas,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'em_andamento') AS atividades_em_andamento,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'bloqueada')   AS atividades_bloqueadas,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'planejada')   AS atividades_planejadas,
  ROUND(
    CASE WHEN COUNT(a.id) > 0
      THEN AVG(a.percentual_exec) ELSE 0
    END, 2
  )                                              AS percentual_geral,

  -- Efetivo hoje
  COALESCE(ej.efetivo_hoje, 0)                  AS efetivo_hoje,

  -- Impedimentos abertos
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'aberto')      AS impedimentos_abertos,

  -- Inspeções
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'aguardando')          AS inspecoes_aguardando,
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'aprovada')             AS inspecoes_aprovadas,
  COUNT(DISTINCT insp.id) FILTER (WHERE insp.status = 'reprovada')            AS inspecoes_reprovadas,

  -- Pendências
  COUNT(DISTINCT p.id) FILTER (WHERE p.status NOT IN ('validada','cancelada')) AS pendencias_abertas

FROM obras o
LEFT JOIN atividades a         ON a.obra_id = o.id
LEFT JOIN impedimentos i       ON i.obra_id = o.id
LEFT JOIN inspecoes insp       ON insp.obra_id = o.id
LEFT JOIN pendencias p         ON p.obra_id = o.id
LEFT JOIN LATERAL (
  SELECT SUM(ep.efetivo_presente) AS efetivo_hoje
  FROM diario_obra ep
  WHERE ep.obra_id = o.id AND ep.data = CURRENT_DATE
) ej ON TRUE
GROUP BY o.id, o.construtora_id, o.nome, o.tipo, o.status,
         o.data_inicio, o.data_fim_prev, ej.efetivo_hoje;

-- ============================================================
-- VIEW: progresso por estrutura (unidade/bloco/setor)
-- ============================================================
CREATE OR REPLACE VIEW vw_progresso_estrutura AS
SELECT
  eo.id                     AS estrutura_id,
  eo.obra_id,
  eo.parent_id,
  eo.tipo,
  eo.nome,
  eo.codigo,
  COUNT(a.id)               AS total_atividades,
  ROUND(COALESCE(AVG(a.percentual_exec), 0), 2) AS percentual_exec,
  SUM(CASE WHEN a.status = 'concluida'    THEN 1 ELSE 0 END) AS concluidas,
  SUM(CASE WHEN a.status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento,
  SUM(CASE WHEN a.status = 'bloqueada'    THEN 1 ELSE 0 END) AS bloqueadas
FROM estrutura_obra eo
LEFT JOIN atividades a ON a.estrutura_id = eo.id
GROUP BY eo.id, eo.obra_id, eo.parent_id, eo.tipo, eo.nome, eo.codigo;

-- ============================================================
-- VIEW: produção por empreiteiro/obra
-- ============================================================
CREATE OR REPLACE VIEW vw_producao_empreiteiro AS
SELECT
  p.obra_id,
  p.empreiteiro_id,
  e.razao_social   AS empreiteiro_nome,
  p.data,
  COUNT(p.id)      AS qtd_lancamentos,
  SUM(p.quantidade) AS total_quantidade,
  p.unidade
FROM producoes p
JOIN empreiteiros e ON e.id = p.empreiteiro_id
GROUP BY p.obra_id, p.empreiteiro_id, e.razao_social, p.data, p.unidade;
