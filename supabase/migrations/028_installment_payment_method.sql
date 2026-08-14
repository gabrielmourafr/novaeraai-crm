-- ============================================================
-- Bloco D do plano de alinhamento do Financeiro: forma de
-- pagamento por parcela — pra registrar contratos com pagamento
-- misto (ex: 30% no cartão + restante parcelado no boleto).
-- Coluna nova, nullable — nenhuma parcela existente é alterada.
-- ============================================================

ALTER TABLE project_installments
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'cartao', 'transferencia'));
