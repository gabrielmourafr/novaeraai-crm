-- ============================================================
-- Controle de pagamentos a parceiros comerciais e desenvolvedores
-- ============================================================

CREATE TABLE partner_payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         UUID REFERENCES organizations NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('parceiro', 'desenvolvedor')),
  recipient_name TEXT NOT NULL,
  recipient_user_id UUID REFERENCES users, -- opcional, se o recebedor é um usuário interno do sistema
  project_id     UUID REFERENCES projects,
  description    TEXT NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  due_date       DATE,
  paid_at        DATE,
  status         TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')) DEFAULT 'pendente',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  created_by     UUID REFERENCES users
);

CREATE INDEX idx_partner_payments_org ON partner_payments(org_id);
CREATE INDEX idx_partner_payments_project ON partner_payments(project_id);
CREATE INDEX idx_partner_payments_status ON partner_payments(org_id, status);

CREATE TRIGGER trg_partner_payments_updated_at BEFORE UPDATE ON partner_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE partner_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_partner_payments" ON partner_payments FOR ALL
  USING (org_id = get_user_org_id());

-- Auditoria (mesmo padrão das outras tabelas principais)
DROP TRIGGER IF EXISTS trg_audit_partner_payments ON partner_payments;
CREATE TRIGGER trg_audit_partner_payments AFTER INSERT OR UPDATE OR DELETE ON partner_payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
