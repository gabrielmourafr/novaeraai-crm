-- ============================================================
-- Propostas viviam totalmente desconectadas do kanban de leads:
-- mover um lead para "Proposta Enviada", "Fechado — Ganho" ou
-- "Fechado — Perdido" não mexia em nada na proposta vinculada.
-- Resultado: proposta de lead já perdido continuava contando como
-- "enviada" nos cards de Propostas e do Comercial.
--
-- Este trigger espelha o estágio do lead na proposta ligada a ele:
--   entrou em "...proposta..."  -> rascunho vira enviada
--   entrou em "...ganho..."     -> ativa vira aceita
--   entrou em "...perdido..."   -> ativa vira recusada
--
-- Só mexe em proposta que ainda está "ativa" (rascunho/enviada/
-- visualizada) — nunca reabre nem sobrescreve uma já fechada
-- manualmente. Voltar o lead pra um estágio anterior também não
-- reverte a proposta: reabrir é decisão manual, não adivinhação.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_sync_proposal_status_with_lead_stage()
RETURNS trigger AS $$
DECLARE
  v_stage_name text;
BEGIN
  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    SELECT name INTO v_stage_name FROM pipeline_stages WHERE id = NEW.stage_id;

    IF v_stage_name ILIKE '%perdido%' THEN
      UPDATE proposals
         SET status = 'recusada'
       WHERE lead_id = NEW.id
         AND status IN ('rascunho', 'enviada', 'visualizada');

    ELSIF v_stage_name ILIKE '%ganho%' THEN
      UPDATE proposals
         SET status = 'aceita'
       WHERE lead_id = NEW.id
         AND status IN ('rascunho', 'enviada', 'visualizada');

    ELSIF v_stage_name ILIKE '%proposta%' THEN
      UPDATE proposals
         SET status = 'enviada'
       WHERE lead_id = NEW.id
         AND status = 'rascunho';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS lead_stage_sync_proposal ON leads;
CREATE TRIGGER lead_stage_sync_proposal
AFTER UPDATE OF stage_id ON leads
FOR EACH ROW EXECUTE FUNCTION trg_sync_proposal_status_with_lead_stage();

-- Backfill: alinha o que já está fora de sincronia hoje.
UPDATE proposals p
   SET status = 'recusada'
  FROM leads l
  JOIN pipeline_stages s ON s.id = l.stage_id
 WHERE p.lead_id = l.id
   AND s.name ILIKE '%perdido%'
   AND p.status IN ('rascunho', 'enviada', 'visualizada');

UPDATE proposals p
   SET status = 'aceita'
  FROM leads l
  JOIN pipeline_stages s ON s.id = l.stage_id
 WHERE p.lead_id = l.id
   AND s.name ILIKE '%ganho%'
   AND p.status IN ('rascunho', 'enviada', 'visualizada');
