-- ============================================================
-- SGO — 12_fix_definitivo.sql
-- DIAGNÓSTICO + CORREÇÃO COMPLETA
-- Usa APENAS funções que já existem no banco:
--   get_construtora_id(), get_perfil_construtora(), is_admin()
--   is_superadmin(), minha_construtora_id()
-- ============================================================

-- ─── 0. Diagnóstico (veja nos resultados) ─────────────────────
DO $$
DECLARE
  v_perfil TEXT;
  v_cid    UUID;
  v_ps     TEXT;
BEGIN
  SELECT perfil::TEXT, construtora_id, perfil_sistema
  INTO   v_perfil, v_cid, v_ps
  FROM   usuarios
  WHERE  email = 'israel1magalhaes2@gmail.com';

  RAISE NOTICE '=== DIAGNÓSTICO ===';
  RAISE NOTICE 'email : israel1magalhaes2@gmail.com';
  RAISE NOTICE 'perfil: %', COALESCE(v_perfil, 'NULL ← PROBLEMA');
  RAISE NOTICE 'construtora_id: %', COALESCE(v_cid::TEXT, 'NULL ← PROBLEMA');
  RAISE NOTICE 'perfil_sistema: %', COALESCE(v_ps, 'NULL ← PROBLEMA');
END $$;

-- ─── 1. Corrigir perfil e ativar israel ───────────────────────
UPDATE usuarios
  SET perfil         = 'administrador',
      ativo          = TRUE,
      perfil_sistema = 'user'
  WHERE email = 'israel1magalhaes2@gmail.com';

-- ─── 2. Limpar TODAS as policies que adicionei (SQL 10 + 11) ──
-- (as originais de 11_rls_policies.sql serão restauradas abaixo)
DROP POLICY IF EXISTS "obras_select"           ON obras;
DROP POLICY IF EXISTS "obras_insert"           ON obras;
DROP POLICY IF EXISTS "obras_update"           ON obras;
DROP POLICY IF EXISTS "obras_delete"           ON obras;
DROP POLICY IF EXISTS "obras_manage"           ON obras;
DROP POLICY IF EXISTS "usuarios_insert_gestor" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_gestor" ON usuarios;
DROP POLICY IF EXISTS "uo_all"                 ON usuarios_obra;
DROP POLICY IF EXISTS "uo_select"              ON usuarios_obra;

-- ─── 3. Restaurar policies de obras (usando funções reais) ────
-- SELECT: qualquer usuário da construtora vê todas as obras
CREATE POLICY "obras_select"
  ON obras FOR SELECT
  USING (construtora_id = get_construtora_id());

-- INSERT/UPDATE/DELETE: apenas administrador ou gerente
CREATE POLICY "obras_manage"
  ON obras FOR ALL
  USING (
    construtora_id = get_construtora_id()
    AND get_perfil_construtora() IN ('administrador','gerente')
  );

-- ─── 4. Policy usuarios — gestor cria/edita equipe ────────────
DROP POLICY IF EXISTS "usuarios_insert_gestor" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_gestor" ON usuarios;

CREATE POLICY "usuarios_insert_gestor" ON usuarios
  FOR INSERT WITH CHECK (construtora_id = get_construtora_id());

CREATE POLICY "usuarios_update_gestor" ON usuarios
  FOR UPDATE USING (construtora_id = get_construtora_id());

-- ─── 5. Tabela usuarios_obra (nova, para vincular eng → obra) ─
CREATE TABLE IF NOT EXISTS usuarios_obra (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id)     ON DELETE CASCADE,
  obra_id        UUID NOT NULL REFERENCES obras(id)        ON DELETE CASCADE,
  construtora_id UUID NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
  papel          TEXT NOT NULL DEFAULT 'engenheiro',
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, obra_id)
);
ALTER TABLE usuarios_obra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uo_all" ON usuarios_obra
  FOR ALL USING (construtora_id = get_construtora_id());

-- ─── 6. Colunas extras em usuarios ────────────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username    TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS criado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- ─── 7. Extensões ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 8. Funções de suporte (usando get_perfil_construtora) ────
-- buscar_email_por_username — usada no login por username
CREATE OR REPLACE FUNCTION buscar_email_por_username(p_username TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT email FROM usuarios
  WHERE lower(username) = lower(p_username) AND ativo = TRUE
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION buscar_email_por_username(TEXT) TO anon, authenticated;

-- ─── 9. Criar usuário interno (sem email, sem rate limit) ─────
DROP FUNCTION IF EXISTS criar_usuario_interno(TEXT,TEXT,TEXT,TEXT,UUID);

CREATE OR REPLACE FUNCTION criar_usuario_interno(
  p_nome          TEXT,
  p_username      TEXT,
  p_senha         TEXT,
  p_perfil        TEXT,
  p_construtora_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id  UUID;
  v_email    TEXT;
  v_username TEXT;
BEGIN
  -- Valida permissão usando a função REAL do banco
  IF get_perfil_construtora() NOT IN ('administrador', 'gerente') THEN
    RAISE EXCEPTION 'Sem permissão. Apenas administrador ou gerente pode criar usuários.';
  END IF;

  -- Sanitiza username
  v_username := lower(regexp_replace(p_username, '[^a-zA-Z0-9._\-]', '', 'g'));
  IF length(v_username) = 0 THEN
    RAISE EXCEPTION 'Username inválido. Use letras, números, ponto ou traço.';
  END IF;

  -- Verifica unicidade
  IF EXISTS (
    SELECT 1 FROM usuarios
    WHERE lower(username) = v_username
      AND construtora_id = p_construtora_id
      AND ativo = TRUE
  ) THEN
    RAISE EXCEPTION 'O username "%" já está em uso nesta construtora.', v_username;
  END IF;

  -- Monta email interno
  v_email := v_username || '@' || replace(p_construtora_id::TEXT, '-', '') || '.sgo.local';
  v_user_id := gen_random_uuid();

  -- Insere em auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    v_email,
    crypt(p_senha, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome, 'username', v_username),
    FALSE, FALSE, FALSE
  );

  -- Insere em auth.identities
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_email, v_user_id,
    jsonb_build_object('sub', v_user_id::TEXT, 'email', v_email),
    'email', NOW(), NOW(), NOW()
  );

  -- Insere em public.usuarios
  INSERT INTO usuarios (
    id, nome, email, username, perfil, perfil_sistema,
    construtora_id, criado_por, ativo
  ) VALUES (
    v_user_id, p_nome, v_email, v_username,
    p_perfil::perfil_construtora, 'user',
    p_construtora_id, auth.uid(), TRUE
  );

  RETURN v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION criar_usuario_interno(TEXT,TEXT,TEXT,TEXT,UUID) TO authenticated;

-- ─── 10. Verificação final ────────────────────────────────────
DO $$
DECLARE
  v_perfil TEXT;
  v_cid    UUID;
BEGIN
  SELECT perfil::TEXT, construtora_id
  INTO v_perfil, v_cid
  FROM usuarios WHERE email = 'israel1magalhaes2@gmail.com';

  RAISE NOTICE '=== RESULTADO ===';
  RAISE NOTICE 'perfil agora: % (esperado: administrador)', v_perfil;
  RAISE NOTICE 'construtora_id: % (deve ser UUID, não NULL)', COALESCE(v_cid::TEXT, 'NULL ← ainda com problema!');

  -- Verificar funções
  RAISE NOTICE 'criar_usuario_interno: existe=%',
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'criar_usuario_interno');
  RAISE NOTICE 'buscar_email_por_username: existe=%',
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'buscar_email_por_username');

  -- Verificar policies de obras
  RAISE NOTICE 'obras_select policy: existe=%',
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename='obras' AND policyname='obras_select');
  RAISE NOTICE 'obras_manage policy: existe=%',
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename='obras' AND policyname='obras_manage');
END $$;
