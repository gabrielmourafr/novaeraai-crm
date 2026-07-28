-- ============================================================
-- Corrige: editar/remover a mensalidade direto no projeto (fora do
-- drag do kanban) não estava limpando a receita pendente já gerada.
-- Agora qualquer mudança em billing_status/billing_amount/billing_day
-- também sincroniza (gera se ativo, remove pendente se desativado/zerado).
-- ============================================================

CREATE OR REPLACE FUNCTION sync_project_billing()
RETURNS TRIGGER AS $$
DECLARE
  v_due_date DATE;
BEGIN
  -- Ativação automática ao mover para "Ativo - Mensalidade" no kanban
  IF TG_OP = 'UPDATE' AND NEW.status = 'ativo_mensalidade' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.billing_status IS NULL OR NEW.billing_status = 'sem_mensalidade' THEN
      NEW.billing_status := 'ativo';
    END IF;
    IF NEW.contract_start IS NULL THEN
      NEW.contract_start := CURRENT_DATE;
    END IF;
  END IF;

  IF NEW.billing_status IS DISTINCT FROM 'ativo' OR NEW.billing_amount IS NULL OR NEW.billing_amount <= 0 THEN
    -- Mensalidade desativada ou sem valor: some com a cobrança ainda não paga.
    -- Receitas já marcadas como "pago" (histórico real) permanecem intactas.
    DELETE FROM revenues
    WHERE project_id = NEW.id AND auto_source = 'project_monthly_billing' AND status = 'pendente';
  ELSE
    v_due_date := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(COALESCE(NEW.billing_day, EXTRACT(DAY FROM CURRENT_DATE)::int), 28)
    );

    IF NOT EXISTS (
      SELECT 1 FROM revenues
      WHERE project_id = NEW.id AND auto_source = 'project_monthly_billing'
        AND date_trunc('month', due_date) = date_trunc('month', v_due_date)
    ) THEN
      INSERT INTO revenues (
        org_id, description, company_id, contact_id, project_id,
        business_unit, value, due_date, status, recurrence, category,
        auto_generated, auto_source
      ) VALUES (
        NEW.org_id, 'Mensalidade - ' || NEW.name, NEW.company_id, NEW.contact_id, NEW.id,
        NEW.business_unit, NEW.billing_amount, v_due_date, 'pendente', 'mensal', 'assinatura',
        true, 'project_monthly_billing'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_activate_billing_on_status ON projects;
CREATE TRIGGER trg_sync_billing_on_status
BEFORE UPDATE OF status ON projects
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_project_billing();

DROP TRIGGER IF EXISTS trg_sync_billing_on_fields ON projects;
CREATE TRIGGER trg_sync_billing_on_fields
AFTER UPDATE OF billing_status, billing_amount, billing_day, name, business_unit, company_id, contact_id
ON projects
FOR EACH ROW
EXECUTE FUNCTION sync_project_billing();

-- Passa a limpar também, não só gerar: cobre qualquer mensalidade que ficou
-- órfã (desativada/zerada mas com receita pendente ainda no ar) sempre que
-- o Financeiro é aberto.
CREATE OR REPLACE FUNCTION ensure_monthly_billing_revenues()
RETURNS void AS $$
DECLARE
  p RECORD;
  v_due_date DATE;
BEGIN
  FOR p IN
    SELECT * FROM projects
    WHERE billing_status IS DISTINCT FROM 'sem_mensalidade'
       OR id IN (SELECT project_id FROM revenues WHERE auto_source = 'project_monthly_billing')
  LOOP
    IF p.billing_status IS DISTINCT FROM 'ativo' OR p.billing_amount IS NULL OR p.billing_amount <= 0 THEN
      DELETE FROM revenues
      WHERE project_id = p.id AND auto_source = 'project_monthly_billing' AND status = 'pendente';
      CONTINUE;
    END IF;

    v_due_date := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(COALESCE(p.billing_day, EXTRACT(DAY FROM CURRENT_DATE)::int), 28)
    );

    IF NOT EXISTS (
      SELECT 1 FROM revenues
      WHERE project_id = p.id AND auto_source = 'project_monthly_billing'
        AND date_trunc('month', due_date) = date_trunc('month', v_due_date)
    ) THEN
      INSERT INTO revenues (
        org_id, description, company_id, contact_id, project_id,
        business_unit, value, due_date, status, recurrence, category,
        auto_generated, auto_source
      ) VALUES (
        p.org_id, 'Mensalidade - ' || p.name, p.company_id, p.contact_id, p.id,
        p.business_unit, p.billing_amount, v_due_date, 'pendente', 'mensal', 'assinatura',
        true, 'project_monthly_billing'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ensure_monthly_billing_revenues() TO authenticated;

-- Corrige agora mesmo qualquer receita pendente órfã já existente
SELECT ensure_monthly_billing_revenues();
