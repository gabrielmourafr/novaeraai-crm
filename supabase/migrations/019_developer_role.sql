-- ============================================================
-- Novo papel "developer": acesso restrito só à área de Entrega
-- (Projetos e Documentos). Controle de navegação fica no middleware/
-- sidebar da aplicação — este papel ainda enxerga os dados da org
-- normalmente nessas duas áreas (mesma RLS de sempre).
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['admin', 'member', 'developer']));
