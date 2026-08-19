-- ============================================================
-- Bug: mover um lead para um estágio "Fechado — Ganho"/"Fechado —
-- Perdido" (arrastar no kanban) não marcava closed_at, então o
-- lead continuava contando como ativo/quente em Comercial e no
-- resumo de leads da empresa (companies/[id]), mesmo já fechado.
-- Estende o trigger existente de criação automática de projeto
-- pra também manter closed_at sincronizado com o estágio atual.
-- Não mexe em archived (isso continua exclusivo do fluxo "Marcar
-- como perdido"), só em closed_at.
-- ============================================================

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

    -- Mantém closed_at sincronizado com o estágio: entrou em qualquer
    -- estágio "Fechado" (Ganho ou Perdido) => marca fechado; voltou pra
    -- um estágio aberto => reabre.
    IF v_new_stage_name ILIKE '%fechado%' THEN
      IF NEW.closed_at IS NULL THEN
        NEW.closed_at := now();
      END IF;
    ELSE
      NEW.closed_at := NULL;
    END IF;

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
BEFORE UPDATE OF stage_id ON leads
FOR EACH ROW EXECUTE FUNCTION trg_lead_won_create_project();

-- Backfill: leads que já estão hoje em estágio Fechado mas ainda sem
-- closed_at (fechados via drag antes desse fix).
UPDATE leads l
SET closed_at = now()
FROM pipeline_stages s
WHERE l.stage_id = s.id
  AND s.name ILIKE '%fechado%'
  AND l.closed_at IS NULL;
