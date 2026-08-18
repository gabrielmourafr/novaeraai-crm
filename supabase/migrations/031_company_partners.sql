-- ============================================================
-- Distribuição de lucros por sócio: cadastro dos sócios da empresa
-- e o % que cada um recebe do lucro (saldo) do período. Tabela nova,
-- não mexe em nada existente.
-- ============================================================

CREATE TABLE IF NOT EXISTS company_partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  percentage  NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_partners_org ON company_partners(org_id);

DROP TRIGGER IF EXISTS company_partners_updated_at ON company_partners;
CREATE TRIGGER company_partners_updated_at
BEFORE UPDATE ON company_partners
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at_generic();

ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_partners_select ON company_partners;
CREATE POLICY company_partners_select ON company_partners FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS company_partners_insert ON company_partners;
CREATE POLICY company_partners_insert ON company_partners FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS company_partners_update ON company_partners;
CREATE POLICY company_partners_update ON company_partners FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS company_partners_delete ON company_partners;
CREATE POLICY company_partners_delete ON company_partners FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
