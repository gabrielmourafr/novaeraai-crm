-- ============================================================
-- Status "agendado" pra despesas: o pagamento já está programado
-- (débito automático, boleto agendado etc), mas ainda não caiu. Ao
-- chegar a data de vencimento, vira "pago" sozinho — sem esperar
-- alguém entrar no sistema e trocar manualmente.
--
-- Sem pg_cron disponível no projeto (mesmo padrão já usado em
-- ensure_monthly_fixed_expenses): a função roda via RPC disparado pelo
-- front ao abrir a tela financeira, não por um job agendado no banco.
--
-- Aditivo: só amplia o CHECK, nenhuma despesa existente é alterada.
-- ============================================================

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('pendente', 'agendado', 'pago', 'atrasado'));

CREATE OR REPLACE FUNCTION mark_scheduled_expenses_as_paid()
RETURNS void AS $$
BEGIN
  UPDATE expenses
     SET status = 'pago',
         paid_at = COALESCE(paid_at, due_date)
   WHERE status = 'agendado'
     AND due_date IS NOT NULL
     AND due_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION mark_scheduled_expenses_as_paid() TO authenticated;
