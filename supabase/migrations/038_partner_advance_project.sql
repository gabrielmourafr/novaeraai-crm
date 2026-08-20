-- ============================================================
-- Adiantamento por sócio pode ser vinculado a um projeto específico —
-- pra distribuir o lucro DAQUELE projeto (recebido - custos) entre os
-- sócios, e o saldo disponível daquele projeto cair conforme se
-- distribui, em vez de só existir um saldo geral do mês.
-- ============================================================

ALTER TABLE partner_advances
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_advances_project ON partner_advances(project_id);
