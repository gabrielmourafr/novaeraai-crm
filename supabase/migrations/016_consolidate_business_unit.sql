-- ============================================================
-- Remove a segmentação Labs/Advisory/Enterprise: tudo passa a operar
-- como uma frente única ("intelligence" internamente, sem expor isso
-- na interface). Consolida os 3 pipelines de leads em 1.
-- ============================================================

-- Permite 'intelligence' em pipelines (antes só aceitava labs/advisory/enterprise)
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_business_unit_check;
ALTER TABLE pipelines ADD CONSTRAINT pipelines_business_unit_check
  CHECK (business_unit = ANY (ARRAY['labs', 'advisory', 'enterprise', 'intelligence']));

DO $$
DECLARE
  v_keep_pipeline_id UUID;
  v_org RECORD;
BEGIN
  FOR v_org IN SELECT id FROM organizations LOOP
    -- Pipeline a manter: o mais antigo da org (geralmente "Pipeline Labs")
    SELECT id INTO v_keep_pipeline_id
    FROM pipelines WHERE org_id = v_org.id
    ORDER BY created_at ASC LIMIT 1;

    IF v_keep_pipeline_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Reatribui leads dos outros pipelines da org para o pipeline mantido,
    -- casando pelo nome do estágio (todos os pipelines V1 têm os mesmos nomes de estágio)
    UPDATE leads l
    SET pipeline_id = v_keep_pipeline_id,
        stage_id = ks.id
    FROM pipeline_stages os
    JOIN pipeline_stages ks ON ks.pipeline_id = v_keep_pipeline_id AND ks.name = os.name
    WHERE l.stage_id = os.id
      AND l.pipeline_id != v_keep_pipeline_id
      AND os.pipeline_id IN (SELECT id FROM pipelines WHERE org_id = v_org.id);

    -- Remove os pipelines excedentes da org (stages somem via cascade)
    DELETE FROM pipelines WHERE org_id = v_org.id AND id != v_keep_pipeline_id;

    -- Renomeia e marca como frente única
    UPDATE pipelines SET name = 'Pipeline Comercial', business_unit = 'intelligence'
    WHERE id = v_keep_pipeline_id;
  END LOOP;
END;
$$;

-- Daqui pra frente, uma org nova ganha só 1 pipeline (função usada pelo trigger de signup)
CREATE OR REPLACE FUNCTION seed_default_pipelines(p_org_id UUID)
RETURNS void AS $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  INSERT INTO pipelines (org_id, name, business_unit)
  VALUES (p_org_id, 'Pipeline Comercial', 'intelligence')
  RETURNING id INTO v_pipeline_id;

  INSERT INTO pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Novo Lead', 1, '#0B87C3'),
    (v_pipeline_id, 'Qualificação', 2, '#0B87C3'),
    (v_pipeline_id, 'Demonstração', 3, '#0B87C3'),
    (v_pipeline_id, 'Proposta Enviada', 4, '#F59E0B'),
    (v_pipeline_id, 'Negociação', 5, '#F59E0B'),
    (v_pipeline_id, 'Fechado — Ganho', 6, '#10B981'),
    (v_pipeline_id, 'Fechado — Perdido', 7, '#EF4444');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
