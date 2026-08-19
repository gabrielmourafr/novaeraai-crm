-- ============================================================
-- Pagamento de parceiro/dev marcado como "pago" passa a cair em
-- Despesas Pagas (Financeiro > Despesas) automaticamente — hoje
-- partner_payments é uma tabela isolada, então essas saídas nunca
-- entravam no Saldo, nos gráficos de despesa, etc.
--
-- Coluna nova (nullable, não mexe em nada existente) linka a
-- despesa gerada de volta pro pagamento de origem, pra o trigger
-- achar/atualizar/remover sem depender de casar por descrição.
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS source_partner_payment_id UUID REFERENCES partner_payments(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION sync_partner_payment_to_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_description TEXT;
BEGIN
  v_description := 'Pagamento — ' || NEW.recipient_name ||
    CASE WHEN NEW.description IS NOT NULL AND NEW.description <> '' THEN ' (' || NEW.description || ')' ELSE '' END;

  IF NEW.status = 'pago' THEN
    UPDATE expenses
    SET description = v_description,
        category = 'pessoal',
        value = NEW.amount,
        due_date = COALESCE(NEW.due_date, NEW.paid_at),
        paid_at = NEW.paid_at,
        status = 'pago',
        project_id = NEW.project_id
    WHERE source_partner_payment_id = NEW.id;

    IF NOT FOUND THEN
      INSERT INTO expenses (
        org_id, description, category, value, due_date, paid_at, status,
        recurrence, project_id, source_partner_payment_id
      ) VALUES (
        NEW.org_id, v_description, 'pessoal', NEW.amount,
        COALESCE(NEW.due_date, NEW.paid_at), NEW.paid_at, 'pago',
        'pontual', NEW.project_id, NEW.id
      );
    END IF;
  ELSE
    -- Reaberto/cancelado: a saída deixa de ser real, some da despesa paga
    DELETE FROM expenses WHERE source_partner_payment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_partner_payment_to_expense ON partner_payments;
CREATE TRIGGER trg_sync_partner_payment_to_expense
AFTER INSERT OR UPDATE ON partner_payments
FOR EACH ROW EXECUTE FUNCTION sync_partner_payment_to_expense();

-- Backfill: pagamentos já marcados como pagos antes desse trigger existir
INSERT INTO expenses (
  org_id, description, category, value, due_date, paid_at, status,
  recurrence, project_id, source_partner_payment_id
)
SELECT
  pp.org_id,
  'Pagamento — ' || pp.recipient_name ||
    CASE WHEN pp.description IS NOT NULL AND pp.description <> '' THEN ' (' || pp.description || ')' ELSE '' END,
  'pessoal', pp.amount, COALESCE(pp.due_date, pp.paid_at), pp.paid_at, 'pago',
  'pontual', pp.project_id, pp.id
FROM partner_payments pp
WHERE pp.status = 'pago'
  AND NOT EXISTS (SELECT 1 FROM expenses e WHERE e.source_partner_payment_id = pp.id);
