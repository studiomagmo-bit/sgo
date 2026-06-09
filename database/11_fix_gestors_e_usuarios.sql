-- ============================================================
-- SGO — 11_fix_gestors_e_usuarios.sql
-- 1. Corrige perfil do admin principal para 'administrador'
-- 2. Função criar_usuario_interno() — sem email, sem rate limit
-- 3. Função buscar_email_por_username() — login por username
-- 4. Garante policy INSERT em obras para gestores
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── 1. Corrigir perfil do admin principal ────────────────────
-- israel1magalhaes2@gmail.com deve ser 'administrador', não 'engenheiro'
UPDATE usuarios
  SET perfil = 'administrador'
  WHERE email = 'israel1magalhaes2@gmail.com';

-- Verificar:
-- SELECT id, nome, email, perfil FROM usuarios WHERE email = 'israel1magalhaes2@gmail.com';


-- ─── 2. Função criar_usuario_interno() ───────────────────────
-- Cria auth.user + usuarios em uma única transação
-- SEM envio de email, SEM rate limit, SEM confirmação
-- SECURITY DEFINER roda com privilégios do postgres
DROP FUNCTION IF EXISTS criar_usuario_interno(TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION criar_usuario_interno(
  p_nome         TEXT,
  p_username     TEXT,
  p_senha        TEXT,
  p_perfil       TEXT,
  p_construtora_id UUID
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id  UUID;
  v_email    TEXT;
  v_username TEXT;
BEGIN
  -- Somente gestor/administrador pode criar usuários
  IF meu_perfil() NOT IN ('administrador', 'gerente') THEN
    RAISE EXCEPTION 'Sem permissão: apenas administrador ou gerente pode criar usuários.';
  END IF;

  -- Sanitiza o username: apenas letras, números, ponto, traço, underscore
  v_username := lower(regexp_replace(p_username, '[^a-zA-Z0-9._\-]', '', 'g'));
  IF length(v_username) = 0 THEN
    RAISE EXCEPTION 'Username inválido após sanitização.';
  END IF;

  -- Gera email interno único (nunca exibido ao usuário)
  v_email := v_username || '@' || p_construtora_id::TEXT || '.sgo.local';

  -- Verifica se username já existe na construtora
  IF EXISTS (
    SELECT 1 FROM usuarios
    WHERE lower(username) = v_username
      AND construtora_id = p_construtora_id
      AND ativo = TRUE
  ) THEN
    RAISE EXCEPTION 'Username "%" já está em uso nesta construtora.', p_username;
  END IF;

  -- Gera UUID para o novo usuário
  v_user_id := gen_random_uuid();

  -- Insere diretamente em auth.users (sem enviar email)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,   -- confirmado na hora → sem email de confirmação
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_senha, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nome', p_nome, 'username', v_username),
    FALSE
  );

  -- Insere em auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    provider_id
  ) VALUES (
    v_user_id::TEXT,
    v_user_id,
    jsonb_build_object('sub', v_user_id::TEXT, 'email', v_email),
    'email',
    NOW(),
    NOW(),
    NOW(),
    v_email
  );

  -- Insere na tabela pública usuarios
  INSERT INTO usuarios (
    id, nome, email, username, perfil,
    construtora_id, criado_por, ativo
  ) VALUES (
    v_user_id, p_nome, v_email, v_username,
    p_perfil, p_construtora_id, auth.uid(), TRUE
  );

  RETURN v_user_id;
END;
$$;

-- Permissão: qualquer usuário autenticado pode chamar (a função valida perfil internamente)
GRANT EXECUTE ON FUNCTION criar_usuario_interno(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;


-- ─── 3. Função buscar_email_por_username() ────────────────────
-- Usada no login: se o input não tem @, busca o email interno
DROP FUNCTION IF EXISTS buscar_email_por_username(TEXT);

CREATE OR REPLACE FUNCTION buscar_email_por_username(p_username TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT email
  FROM usuarios
  WHERE lower(username) = lower(p_username)
    AND ativo = TRUE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION buscar_email_por_username(TEXT) TO anon, authenticated;


-- ─── 4. Policy INSERT obras para gestor ──────────────────────
-- Garante que administrador/gerente pode criar obras
DROP POLICY IF EXISTS "obras_insert" ON obras;

CREATE POLICY "obras_insert" ON obras
  FOR INSERT WITH CHECK (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );

DROP POLICY IF EXISTS "obras_update" ON obras;

CREATE POLICY "obras_update" ON obras
  FOR UPDATE USING (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );

DROP POLICY IF EXISTS "obras_delete" ON obras;

CREATE POLICY "obras_delete" ON obras
  FOR DELETE USING (
    construtora_id = minha_construtora_id()
    AND meu_perfil() IN ('administrador', 'gerente')
  );


-- ─── 5. Verificações ─────────────────────────────────────────
-- SELECT id, nome, email, perfil FROM usuarios WHERE email = 'israel1magalhaes2@gmail.com';
-- SELECT proname FROM pg_proc WHERE proname IN ('criar_usuario_interno','buscar_email_por_username');
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'obras';
