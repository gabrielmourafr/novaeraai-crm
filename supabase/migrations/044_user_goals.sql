-- ============================================================
-- Metas individuais por mês: reuniões (mês e semana) e VGV.
--
-- revenue_goals continua sendo a meta da empresa. Esta tabela é por
-- pessoa, pra medir vendedor a vendedor — a meta da empresa passa a
-- poder ser lida como a soma das individuais.
--
-- Realizado não é guardado aqui: é sempre calculado do dado real
-- (eventos da agenda e projetos fechados), pra não existir número
-- desencontrado.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_goals (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id               UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  reference_month      DATE NOT NULL,                    -- sempre dia 1
  meetings_target_month INTEGER NOT NULL DEFAULT 0 CHECK (meetings_target_month >= 0),
  meetings_target_week  INTEGER NOT NULL DEFAULT 0 CHECK (meetings_target_week >= 0),
  vgv_target            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (vgv_target >= 0),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_user_goals_org_month ON user_goals(org_id, reference_month);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão das outras tabelas: acesso por organização.
DROP POLICY IF EXISTS user_goals_org_access ON user_goals;
CREATE POLICY user_goals_org_access ON user_goals
  FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_user_goals_updated_at ON user_goals;
CREATE TRIGGER trg_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
