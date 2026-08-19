-- ============================================================
-- Sócio pode ser distribuído por % do saldo (como já era) OU por um
-- valor fixo em R$ por mês, independente do saldo. distribution_type
-- decide qual dos dois vale; o outro fica null.
-- ============================================================

ALTER TABLE company_partners
  ADD COLUMN IF NOT EXISTS distribution_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (distribution_type IN ('percentage', 'fixed_value')),
  ADD COLUMN IF NOT EXISTS fixed_value NUMERIC(12,2);

-- percentage precisa poder ficar null quando o sócio é de valor fixo
ALTER TABLE company_partners ALTER COLUMN percentage DROP NOT NULL;
ALTER TABLE company_partners DROP CONSTRAINT IF EXISTS company_partners_percentage_check;

ALTER TABLE company_partners
  ADD CONSTRAINT company_partners_distribution_check CHECK (
    (distribution_type = 'percentage' AND percentage IS NOT NULL AND percentage > 0 AND percentage <= 100)
    OR
    (distribution_type = 'fixed_value' AND fixed_value IS NOT NULL AND fixed_value > 0)
  );
