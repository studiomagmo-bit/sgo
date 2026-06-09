-- ============================================================
-- SGO — Correção: israel1magalhaes2@gmail.com NÃO é superadmin
-- Ele é o owner/master da construtora "Minha Construtora"
-- master@sgo.dev = superadmin (correto)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. Remove superadmin de israel1magalhaes2@gmail.com
UPDATE usuarios
SET perfil_sistema = 'user'
WHERE email = 'israel1magalhaes2@gmail.com';

-- 2. Confirma que master@sgo.dev ainda é superadmin
UPDATE usuarios
SET perfil_sistema = 'superadmin'
WHERE email = 'master@sgo.dev';

-- 3. Verificar resultado
SELECT email, perfil_sistema, perfil, construtora_id
FROM usuarios
WHERE email IN ('israel1magalhaes2@gmail.com', 'master@sgo.dev');

-- Resultado esperado:
-- israel1magalhaes2@gmail.com | user       | administrador (ou owner) | <construtora_id>
-- master@sgo.dev              | superadmin | NULL                     | NULL
