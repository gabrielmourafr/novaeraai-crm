-- ============================================================
-- CORREÇÃO: mover um projeto de volta pra "Ativo - Mensalidade" no
-- kanban não reativava a cobrança se ela já tinha sido encerrada/
-- suspensa antes — o trigger só resetava billing_status quando estava
-- NULL ou 'sem_mensalidade', ignorando 'encerrado'/'suspenso'.
-- Resultado: arrastar de novo não gerava receita nenhuma.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_project_billing()
RETURNS TRIGGER AS $$
DECLARE
  v_due_date DATE;
BEGIN
  -- Mover pro kanban "Ativo - Mensalidade" é uma ativação explícita:
  -- sempre reativa a cobrança, não importa o estado anterior.
  IF TG_OP = 'UPDATE' AND NEW.status = 'ativo_mensalidade' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.billing_status := 'ativo';
    IF NEW.contract_start IS NULL THEN
      NEW.contract_start := CURRENT_DATE;
    END IF;
  END IF;

  IF NEW.billing_status IS DISTINCT FROM 'ativo' OR NEW.billing_amount IS NULL OR NEW.billing_amount <= 0 THEN
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

-- Corrige agora o caso real: reativa e garante a receita do mês corrente
-- pra qualquer projeto que já está em "Ativo - Mensalidade" no kanban mas
-- ficou com billing_status desalinhado (ex: "encerrado" de antes).
UPDATE projects
SET billing_status = 'ativo'
WHERE status = 'ativo_mensalidade' AND billing_status IS DISTINCT FROM 'ativo';

SELECT ensure_monthly_billing_revenues();
