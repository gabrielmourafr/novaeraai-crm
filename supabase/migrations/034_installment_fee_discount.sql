-- ============================================================
-- Parcelas de contrato: quando a forma de pagamento é cartão, o
-- cliente às vezes recebe com desconto de taxa da maquininha; quando
-- é pix, às vezes é dado um desconto direto. Campos opcionais em %,
-- o valor em R$ é sempre calculado pelo sistema (amount * percent/100)
-- e somado — não se preenche manualmente em reais.
-- ============================================================

ALTER TABLE project_installments
  ADD COLUMN IF NOT EXISTS card_fee_percent      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pix_discount_percent  NUMERIC(5,2);
