-- ============================================================
-- SGO - Sistema de Gestão Operacional de Obras
-- 00 - MIGRATION MASTER
-- Execute este arquivo no SQL Editor do Supabase
-- OU rode cada arquivo na ordem abaixo
-- ============================================================
-- ORDEM DE EXECUÇÃO:
--   01_extensions_and_types.sql
--   02_core_tables.sql
--   03_obras.sql
--   04_pcp.sql
--   05_efetivo_producao.sql
--   06_fotos_impedimentos.sql   ← fotos sem FK pendencias/inspecoes
--   07_almoxarifado_equipamentos.sql
--   08_inspecoes_pendencias.sql  ← cria pendencias/inspecoes + ALTER TABLE fotos
--   09_contratos_medicoes.sql
--   10_diario_obra.sql
--   11_rls_policies.sql
--   12_triggers_functions_views.sql
--   13_seed.sql                  ← apenas desenvolvimento
-- ============================================================

\i 01_extensions_and_types.sql
\i 02_core_tables.sql
\i 03_obras.sql
\i 04_pcp.sql
\i 05_efetivo_producao.sql
\i 06_fotos_impedimentos.sql
\i 07_almoxarifado_equipamentos.sql
\i 08_inspecoes_pendencias.sql
\i 09_contratos_medicoes.sql
\i 10_diario_obra.sql
\i 11_rls_policies.sql
\i 12_triggers_functions_views.sql
-- \i 13_seed.sql   -- descomente apenas para dev/staging
