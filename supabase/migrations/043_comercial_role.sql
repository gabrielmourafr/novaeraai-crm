-- ============================================================
-- Papel "comercial": vendedor/closer.
--
-- Acesso ao bloco Comercial inteiro (Leads, Empresas, Propostas,
-- Catálogo), à Gestão (Tarefas e Agenda) e ao Customer Success —
-- neste último, só a carteira dele: os projetos em que ele consta
-- como "Fechado por" (projects.closed_by_user_id).
--
-- Aditivo: só amplia o CHECK, nenhum usuário existente é alterado.
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'developer', 'comercial'));
