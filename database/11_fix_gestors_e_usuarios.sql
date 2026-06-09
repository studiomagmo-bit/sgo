-- ============================================================
-- SGO — 11_fix_gestors_e_usuarios.sql  (versão definitiva)
-- Execute COMPLETO no Supabase → SQL Editor → Run
-- ============================================================

-- ─── 0. Extensões necessárias ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Colunas novas em usuarios (idempotente) ───────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS username    TEXT,
  ADD COLUMN IF NOT EXISTS criado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- ─── 2. Corrigir perfil do admin principal ────────────────────
UPDATE usuarios
  SET perfil = 'administrador'
  WHERE email = 'israel1magalhaes2@gmail.com';

-- Verifica:
-- SELECT id, nome, email, perfil, ativo FROM usuarios WHERE email = 'israel1magalhaes2@gmail.com';

-- ─── 3. Garantir que o admin está ativo ───────────────────────
UPDATE usuarios
  SET ativo = TRUE
  WHERE email = 'israel1magalhaes2@gmail.com';

-- ─── 4. Tabela usuarios_obra ──────────────────────────────────
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

DROP POLICY IF EXISTS "uo_all"       ON usuarios_obra;
DROP POLICY IF EXISTS "uo_select"    ON usuarios_obra;
DROP POLICY IF EXISTS "uo_insert"    ON usuarios_obra;
DROP POLICY IF EXISTS "uo_update"    ON usuarios_obra;
DROP POLICY IF EXISTS "uo_delete"    ON usuarios_obra;
DROP POLICY IF EXISTS "uo_superadmin"ON usuarios_obra;

CREATE POLICY "uo_all" ON usuarios_obra
  FOR ALL USING (construtora_id = minha_construtora_id());

-- ─── 5. Obras — RLS simplificada (sem restrição por papel) ────
-- Qualquer usuário autenticado da construtora vê todas as obras
DROP POLICY IF EXISTS "obras_select"    ON obras;
DROP POLICY IF EXISTS "obras_insert"    ON obras;
DROP POLICY IF EXISTS "obras_update"    ON obras;
DROP POLICY IF EXISTS "obras_delete"    ON obras;

CREATE POLICY "obras_select" ON obras
  FOR SELECT USING (construtora_id = minha_construtora_id());

CREATE POLICY "obras_insert" ON obras
  FOR INSERT WITH CHECK (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );

CREATE POLICY "obras_update" ON obras
  FOR UPDATE USING (construtora_id = minha_construtora_id());

CREATE POLICY "obras_delete" ON obras
  FOR DELETE USING (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );

-- ─── 6. Usuarios — policies para gestor gerenciar equipe ──────
DROP POLICY IF EXISTS "usuarios_insert_gestor" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_gestor" ON usuarios;

CREATE POLICY "usuarios_insert_gestor" ON usuarios
  FOR INSERT WITH CHECK (construtora_id = minha_construtora_id());

CREATE POLICY "usuarios_update_gestor" ON usuarios
  FOR UPDATE USING (construtora_id = minha_construtora_id());

-- ─── 7. Funções auxiliares ────────────────────────────────────
CREATE OR REPLACE FUNCTION meu_perfil()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT perfil::TEXT FROM usuarios
  WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION minhas_obras_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT obra_id FROM usuarios_obra
    WHERE usuario_id = auth.uid() AND ativo = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION buscar_email_por_username(p_username TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT email FROM usuarios
  WHERE lower(username) = lower(p_username) AND ativo = TRUE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION buscar_email_por_username(TEXT) TO anon, authenticated;

-- ─── 8. Função criar_usuario_interno ─────────────────────────
-- Cria auth.user + registro usuarios em uma transação
-- SEM email de confirmação, SEM rate limit
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
  -- Valida permissão
  IF meu_perfil() NOT IN ('administrador', 'gerente') THEN
    RAISE EXCEPTION 'Sem permissão: apenas administrador ou gerente pode criar usuários.';
  END IF;

  -- Sanitiza username: remove tudo que não seja letra, número, ponto, traço, underscore
  v_username := lower(regexp_replace(p_username, '[^a-zA-Z0-9._\-]', '', 'g'));

  IF length(v_username) = 0 THEN
    RAISE EXCEPTION 'Username inválido. Use apenas letras, números, ponto ou traço.';
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

  -- Monta email interno (nunca exibido ao usuário)
  -- Remove hífens do UUID para URL mais limpa
  v_email := v_username
    || '@'
    || replace(p_construtora_id::TEXT, '-', '')
    || '.sgo.local';

  -- Gera UUID do novo usuário
  v_user_id := gen_random_uuid();

  -- ── Insere em auth.users ───────────────────────────────────
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_senha, gen_salt('bf')),
    NOW(),          -- email_confirmed_at = agora → sem confirmação necessária
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('nome', p_nome, 'username', v_username),
    FALSE,
    FALSE,
    FALSE
  );

  -- ── Insere em auth.identities ──────────────────────────────
  -- provider_id = email (chave primária junto com provider)
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_email,
    v_user_id,
    jsonb_build_object('sub', v_user_id::TEXT, 'email', v_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- ── Insere em public.usuarios ──────────────────────────────
  INSERT INTO usuarios (
    id, nome, email, username,
    perfil, construtora_id, criado_por, ativo
  ) VALUES (
    v_user_id, p_nome, v_email, v_username,
    p_perfil, p_construtora_id, auth.uid(), TRUE
  );

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION criar_usuario_interno(TEXT,TEXT,TEXT,TEXT,UUID) TO authenticated;

-- ─── 9. Verificação ──────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== SGO SQL 11 aplicado com sucesso ===';
  RAISE NOTICE 'Admin: %', (SELECT perfil FROM usuarios WHERE email = 'israel1magalhaes2@gmail.com');
  RAISE NOTICE 'Funções criadas: criar_usuario_interno, buscar_email_por_username, meu_perfil, minhas_obras_ids';
END $$;
