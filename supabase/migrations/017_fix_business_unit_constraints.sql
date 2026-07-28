-- ============================================================
-- CORREÇÃO URGENTE: a migration 016 removeu a segmentação de frentes
-- da interface (passou a gravar sempre 'intelligence'), mas esqueceu
-- de liberar 'intelligence' nas constraints de proposals/products/leads.
-- Toda criação de proposta e produto estava falhando.
-- ============================================================

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_business_unit_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_business_unit_check
  CHECK (business_unit = ANY (ARRAY['labs', 'advisory', 'enterprise', 'intelligence']));

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_business_unit_check;
ALTER TABLE products ADD CONSTRAINT products_business_unit_check
  CHECK (business_unit = ANY (ARRAY['labs', 'advisory', 'enterprise', 'intelligence']));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_business_unit_check;
ALTER TABLE leads ADD CONSTRAINT leads_business_unit_check
  CHECK (business_unit = ANY (ARRAY['labs', 'advisory', 'enterprise', 'intelligence']));
