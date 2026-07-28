-- ============================================================
-- Nova etapa no kanban de projetos: "Pronto para Entrega", entre
-- Em Validação Interna e Entregue (Período TET).
-- ============================================================

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status = ANY (ARRAY[
    'contrato_assinado', 'em_desenvolvimento', 'em_validacao_interna', 'pronto_para_entrega',
    'entregue_tet', 'ativo_mensalidade', 'upsell_identificado', 'churned',
    'kickoff', 'em_andamento', 'pausado', 'em_revisao', 'concluido', 'cancelado'
  ]));
