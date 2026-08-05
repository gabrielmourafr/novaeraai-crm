-- ============================================================
-- Novos tipos de documento: Arquitetura Inicial e Arquitetura
-- Técnica, para separar os uploads de Contratos na aba
-- Documentos dentro do projeto.
-- ============================================================

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'contrato', 'proposta', 'briefing', 'ata', 'apresentacao', 'entrega', 'nda',
    'arquitetura_inicial', 'arquitetura_tecnica', 'outro'
  ));
