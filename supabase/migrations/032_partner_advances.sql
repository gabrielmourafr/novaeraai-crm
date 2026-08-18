-- ============================================================
-- Adiantamentos por sócio — valores já retirados por cada sócio,
-- pra abater/comparar com a distribuição de lucro. Tabela nova,
-- não mexe em nada existente.
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_advances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES company_partners(id) ON DELETE CASCADE,
  description TEXT,
  value       NUMERIC(12,2) NOT NULL CHECK (value > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_advances_org     ON partner_advances(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_advances_partner ON partner_advances(partner_id);

DROP TRIGGER IF EXISTS partner_advances_updated_at ON partner_advances;
CREATE TRIGGER partner_advances_updated_at
BEFORE UPDATE ON partner_advances
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at_generic();

ALTER TABLE partner_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_advances_select ON partner_advances;
CREATE POLICY partner_advances_select ON partner_advances FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS partner_advances_insert ON partner_advances;
CREATE POLICY partner_advances_insert ON partner_advances FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS partner_advances_update ON partner_advances;
CREATE POLICY partner_advances_update ON partner_advances FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS partner_advances_delete ON partner_advances;
CREATE POLICY partner_advances_delete ON partner_advances FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
