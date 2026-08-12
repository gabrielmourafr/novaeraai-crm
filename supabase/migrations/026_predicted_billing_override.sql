-- ============================================================
-- Permite sobrescrever manualmente a previsão automática da 1ª
-- mensalidade (prazo de entrega + 30 dias), pra quando o contrato
-- combinar um prazo diferente com o cliente — pedido do Arthur.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS predicted_first_billing_override DATE;
