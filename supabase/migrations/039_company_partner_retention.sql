-- ============================================================
-- Parte do lucro que fica retida pra empresa (não é distribuída a
-- nenhum sócio) — modelada como mais uma linha em company_partners,
-- marcada com is_company = true, reaproveitando o mesmo mecanismo
-- de % ou valor fixo que já existe pros sócios. Assim ela entra
-- naturalmente na soma de 100% e já abate o que sobra pra distribuir.
-- Só uma linha "empresa" por organização.
-- ============================================================

ALTER TABLE company_partners
  ADD COLUMN IF NOT EXISTS is_company BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_partners_one_company_row
  ON company_partners (org_id) WHERE is_company = true;
