-- ============================================================
-- Despesas fixas recorrentes vinculadas a cliente (ex: VPS Trietel,
-- cobrada todo dia X do mês, com prazo de contrato) — gera a
-- despesa do mês automaticamente, igual já acontece com a
-- mensalidade dos projetos. Tudo aditivo, nenhuma despesa
-- existente é alterada.
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS company_id             UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_day             INT CHECK (billing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS contract_start          DATE,
  ADD COLUMN IF NOT EXISTS contract_end            DATE,
  ADD COLUMN IF NOT EXISTS is_recurring_template   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id             UUID REFERENCES expenses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expenses_template_id ON expenses(template_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id  ON expenses(company_id);

-- Gera a despesa do mês corrente pra cada modelo recorrente vinculado a
-- cliente, se ainda não existir uma instância desse modelo nesse mês, e
-- o contrato ainda estiver vigente.
CREATE OR REPLACE FUNCTION ensure_monthly_fixed_expenses()
RETURNS void AS $$
DECLARE
  t RECORD;
  v_due_date DATE;
BEGIN
  FOR t IN
    SELECT * FROM expenses
    WHERE is_recurring_template = true
      AND (contract_end IS NULL OR contract_end >= CURRENT_DATE)
      AND (contract_start IS NULL OR contract_start <= CURRENT_DATE)
  LOOP
    v_due_date := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(COALESCE(t.billing_day, EXTRACT(DAY FROM CURRENT_DATE)::int), 28)
    );

    IF NOT EXISTS (
      SELECT 1 FROM expenses
      WHERE template_id = t.id
        AND date_trunc('month', due_date) = date_trunc('month', v_due_date)
    ) THEN
      INSERT INTO expenses (
        org_id, description, category, value, due_date, status, recurrence,
        expense_type, company_id, billing_day, template_id
      ) VALUES (
        t.org_id, t.description, t.category, t.value, v_due_date, 'pendente', 'mensal',
        t.expense_type, t.company_id, t.billing_day, t.id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ensure_monthly_fixed_expenses() TO authenticated;
