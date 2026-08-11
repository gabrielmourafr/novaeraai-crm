-- ============================================================
-- Pacote de melhorias:
--  1) Controle de Notas Fiscais (parcelas de implementação e receitas/mensalidade)
--  2) Metas mensais (faturamento + comercial)
--  3) Diagnóstico e Arquitetura da Solução em leads
--  4) Criação automática de projeto quando um lead é fechado como Ganho
--     (copia diagnóstico/arquitetura/proposta), com card de aviso pro gabriel
-- ============================================================

-- 1) Notas fiscais -------------------------------------------------------
ALTER TABLE project_installments
  ADD COLUMN IF NOT EXISTS nf_number    text,
  ADD COLUMN IF NOT EXISTS nf_issued_at date;

ALTER TABLE revenues
  ADD COLUMN IF NOT EXISTS nf_number    text,
  ADD COLUMN IF NOT EXISTS nf_issued_at date,
  ADD COLUMN IF NOT EXISTS nf_link      text;

-- 2) Metas mensais --------------------------------------------------------
CREATE TABLE IF NOT EXISTS revenue_goals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference_month   date NOT NULL, -- yyyy-mm-01
  revenue_target    numeric(12,2) NOT NULL DEFAULT 0,
  commercial_target int NOT NULL DEFAULT 0, -- nº de novos contratos/vendas fechadas no mês
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, reference_month)
);

DROP TRIGGER IF EXISTS revenue_goals_updated_at ON revenue_goals;
CREATE TRIGGER revenue_goals_updated_at
BEFORE UPDATE ON revenue_goals
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at_generic();

ALTER TABLE revenue_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS revenue_goals_select ON revenue_goals;
CREATE POLICY revenue_goals_select ON revenue_goals FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS revenue_goals_insert ON revenue_goals;
CREATE POLICY revenue_goals_insert ON revenue_goals FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS revenue_goals_update ON revenue_goals;
CREATE POLICY revenue_goals_update ON revenue_goals FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS revenue_goals_delete ON revenue_goals;
CREATE POLICY revenue_goals_delete ON revenue_goals FOR DELETE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- 3) Diagnóstico e Arquitetura da Solução em leads -------------------------
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS diagnostico          text,
  ADD COLUMN IF NOT EXISTS arquitetura_solucao  text;

-- 4) Criação automática de projeto quando lead vira "Ganho" ---------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS auto_created_from_lead    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_win_notice_dismissed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION trg_lead_won_create_project()
RETURNS trigger AS $$
DECLARE
  v_new_stage_name text;
  v_old_stage_name text;
  v_proposal_id     uuid;
  v_existing_id     uuid;
  v_project_code    text;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    SELECT name INTO v_new_stage_name FROM pipeline_stages WHERE id = NEW.stage_id;
    SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.stage_id;

    IF v_new_stage_name ILIKE '%ganho%'
       AND (v_old_stage_name IS NULL OR v_old_stage_name NOT ILIKE '%ganho%')
       AND NEW.company_id IS NOT NULL THEN

      SELECT id INTO v_existing_id FROM projects WHERE lead_id = NEW.id LIMIT 1;

      IF v_existing_id IS NULL THEN
        SELECT id INTO v_proposal_id FROM proposals
         WHERE lead_id = NEW.id ORDER BY created_at DESC LIMIT 1;

        v_project_code := 'AUTO-' || substr(replace(NEW.id::text, '-', ''), 1, 8);

        INSERT INTO projects (
          org_id, code, name, company_id, contact_id, proposal_id, lead_id,
          business_unit, status, contract_value,
          architecture_doc_url, implementation_notes,
          auto_created_from_lead, created_by
        ) VALUES (
          NEW.org_id, v_project_code, NEW.title, NEW.company_id, NEW.contact_id, v_proposal_id, NEW.id,
          'intelligence', 'contrato_assinado', NEW.value,
          NEW.arquitetura_solucao, NEW.diagnostico,
          true, NEW.created_by
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS lead_won_create_project ON leads;
CREATE TRIGGER lead_won_create_project
AFTER UPDATE OF stage_id ON leads
FOR EACH ROW EXECUTE FUNCTION trg_lead_won_create_project();
