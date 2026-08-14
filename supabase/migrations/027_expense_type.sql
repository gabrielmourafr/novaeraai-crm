-- ============================================================
-- Bloco B do plano de alinhamento do Financeiro: classificação
-- Fixo/Variável nas despesas, pra separar previsão de despesas
-- fixas futuras do resto. Coluna nova, nullable — nenhuma
-- despesa existente é alterada.
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_type TEXT CHECK (expense_type IN ('fixo', 'variavel'));
