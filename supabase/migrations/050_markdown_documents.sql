-- ============================================================
-- Bucket "documents" não aceitava .md — o navegador manda o
-- Content-Type dele como "text/markdown" (às vezes sem tipo nenhum,
-- dependendo do SO), e nenhum dos dois estava na allowlist do bucket.
-- Upload falhava com "Erro ao enviar documento", igual ao problema já
-- resolvido pra CSV/HTML na migration 025.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = allowed_mime_types || ARRAY[
  'text/markdown',
  'text/x-markdown'
]
WHERE id = 'documents'
  AND NOT ('text/markdown' = ANY(allowed_mime_types));
