-- ============================================================
-- Nova etapa "Roadmap" no kanban de projetos, entre Pronto para
-- Entrega e Entregue (Período TET). Também adiciona campo pra
-- registrar o conteúdo do roadmap (HTML colado ou arquivo .html).
-- ============================================================

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status = ANY (ARRAY[
    'contrato_assinado', 'em_desenvolvimento', 'em_validacao_interna', 'pronto_para_entrega',
    'roadmap', 'entregue_tet', 'ativo_mensalidade', 'upsell_identificado', 'churned',
    'kickoff', 'em_andamento', 'pausado', 'em_revisao', 'concluido', 'cancelado'
  ]));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS roadmap_html TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS roadmap_filename TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS roadmap_updated_at TIMESTAMPTZ;
