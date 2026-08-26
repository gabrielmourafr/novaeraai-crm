-- ============================================================
-- Despesas só aceitavam recorrência pontual/mensal/trimestral/anual.
-- Faltava semanal e quinzenal (ex: diarista, combustível semanal,
-- pagamento quinzenal de freela).
--
-- Além de liberar as duas opções no CHECK, o gerador de despesas
-- recorrentes passa a criar TODOS os lançamentos do mês corrente
-- pra esses modelos (4~5 por mês no semanal, 2~3 no quinzenal),
-- e não só um. A âncora é o início do contrato: as ocorrências
-- caem a cada 7 (ou 14) dias a partir dela.
--
-- Tudo aditivo: nenhuma despesa existente é alterada.
-- ============================================================

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_recurrence_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_recurrence_check
  CHECK (recurrence IN ('pontual','semanal','quinzenal','mensal','trimestral','anual'));

CREATE OR REPLACE FUNCTION ensure_monthly_fixed_expenses()
RETURNS void AS $$
DECLARE
  t             RECORD;
  v_due_date    DATE;
  v_month_start DATE := date_trunc('month', CURRENT_DATE)::date;
  v_month_end   DATE := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  v_step        INT;
  v_anchor      DATE;
  v_occ         DATE;
BEGIN
  FOR t IN
    SELECT * FROM expenses
    WHERE is_recurring_template = true
      AND (contract_end IS NULL OR contract_end >= v_month_start)
      AND (contract_start IS NULL OR contract_start <= v_month_end)
  LOOP
    IF t.recurrence IN ('semanal', 'quinzenal') THEN
      -- Semanal/quinzenal: várias ocorrências por mês, contadas a partir
      -- do início do contrato (sem ele, a partir da criação do modelo).
      v_step   := CASE t.recurrence WHEN 'semanal' THEN 7 ELSE 14 END;
      v_anchor := COALESCE(t.contract_start, t.created_at::date);

      -- Primeira ocorrência dentro do mês corrente.
      v_occ := v_anchor;
      IF v_occ < v_month_start THEN
        v_occ := v_anchor + (CEIL((v_month_start - v_anchor)::numeric / v_step) * v_step)::int;
      END IF;

      WHILE v_occ <= v_month_end LOOP
        EXIT WHEN t.contract_end IS NOT NULL AND v_occ > t.contract_end;

        IF NOT EXISTS (
          SELECT 1 FROM expenses
          WHERE template_id = t.id AND due_date = v_occ
        ) THEN
          INSERT INTO expenses (
            org_id, description, category, value, due_date, status, recurrence,
            expense_type, company_id, billing_day, template_id
          ) VALUES (
            t.org_id, t.description, t.category, t.value, v_occ, 'pendente', t.recurrence,
            t.expense_type, t.company_id, t.billing_day, t.id
          );
        END IF;

        v_occ := v_occ + v_step;
      END LOOP;

    ELSE
      -- Mensal (comportamento original): um lançamento por mês, no dia de cobrança.
      IF t.contract_end IS NOT NULL AND t.contract_end < CURRENT_DATE THEN
        CONTINUE;
      END IF;
      IF t.contract_start IS NOT NULL AND t.contract_start > CURRENT_DATE THEN
        CONTINUE;
      END IF;

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
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ensure_monthly_fixed_expenses() TO authenticated;
