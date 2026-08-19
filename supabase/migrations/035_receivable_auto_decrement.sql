-- ============================================================
-- Simplificação do fluxo financeiro de projeto: o projeto registra só
-- Valor Total (contract_value), Valor a Receber (receivable_value) e
-- Mensalidade (billing_amount). O "recebido" passa a ser sempre
-- lançado em Financeiro > Receitas (com data). Quando uma receita
-- manual vinculada a um projeto (categoria "projeto") é marcada como
-- paga, o saldo a receber do projeto é decrementado automaticamente
-- — e revertido se a receita for reaberta/excluída.
--
-- Só reage a receitas manuais (auto_generated = false), pra não
-- entrar em conflito com o sync antigo project -> revenues
-- (sync_project_receivable_revenue, que continua existindo e some
-- espelhando receivable_value numa linha "Valor a receber - X").
-- ============================================================

CREATE OR REPLACE FUNCTION sync_receivable_on_revenue_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pago' AND NEW.project_id IS NOT NULL AND NEW.category = 'projeto' AND NEW.auto_generated = false THEN
      UPDATE projects
      SET receivable_value = GREATEST(0, COALESCE(receivable_value, contract_value, 0) - NEW.value)
      WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pago' AND OLD.project_id IS NOT NULL AND OLD.category = 'projeto' AND OLD.auto_generated = false THEN
      UPDATE projects
      SET receivable_value = COALESCE(receivable_value, contract_value, 0) + OLD.value
      WHERE id = OLD.project_id;
    END IF;
    IF NEW.status = 'pago' AND NEW.project_id IS NOT NULL AND NEW.category = 'projeto' AND NEW.auto_generated = false THEN
      UPDATE projects
      SET receivable_value = GREATEST(0, COALESCE(receivable_value, contract_value, 0) - NEW.value)
      WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'pago' AND OLD.project_id IS NOT NULL AND OLD.category = 'projeto' AND OLD.auto_generated = false THEN
      UPDATE projects
      SET receivable_value = COALESCE(receivable_value, contract_value, 0) + OLD.value
      WHERE id = OLD.project_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_receivable_on_revenue_paid ON revenues;
CREATE TRIGGER trg_sync_receivable_on_revenue_paid
AFTER INSERT OR UPDATE OF status OR DELETE ON revenues
FOR EACH ROW EXECUTE FUNCTION sync_receivable_on_revenue_paid();
