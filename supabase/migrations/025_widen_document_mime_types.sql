-- ============================================================
-- O bucket "documents" só aceitava PDF, Word, Excel, PowerPoint,
-- JPEG/PNG e ZIP — qualquer outro tipo (texto, CSV, HTML, WEBP,
-- HEIC de iPhone, etc.) falhava silenciosamente no upload com
-- "Erro ao enviar documento". Amplia a lista permitida.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'text/html',
  'application/json'
]
WHERE id = 'documents';
