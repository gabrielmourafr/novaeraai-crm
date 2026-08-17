-- ============================================================
-- Adaptações em Tarefas: complexidade, tempo estimado, tempo
-- gasto (rastreado automaticamente entre "Em andamento" e
-- "Concluída"), novos tipos de tarefa (financeiro, contrato,
-- arquitetura da solução, manutenção adaptativa/aditiva/corretiva).
-- Tudo aditivo — os tipos antigos continuam válidos, nenhuma
-- tarefa existente é alterada.
-- ============================================================

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_type_check CHECK (type IN (
  -- legado
  'followup','ligacao','email','reuniao','proposta','entrega','interno','outro',
  -- novos
  'financeiro','contrato','arquitetura_solucao',
  'manutencao_adaptativa','manutencao_aditiva','manutencao_corretiva'
));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS complexity       TEXT CHECK (complexity IN ('baixa','media','alta')),
  ADD COLUMN IF NOT EXISTS estimated_hours  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS started_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ;

-- Marca automaticamente quando a tarefa entrou "Em andamento" e quando
-- foi concluída, pra calcular o tempo gasto (completed_at - started_at)
-- sem depender de cada tela lembrar de setar isso manualmente.
CREATE OR REPLACE FUNCTION trg_track_task_time()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'em_andamento' AND OLD.status IS DISTINCT FROM 'em_andamento' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;

  IF NEW.status = 'concluida' AND OLD.status IS DISTINCT FROM 'concluida' THEN
    IF NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
    NEW.completed_at := now();
  END IF;

  -- reabrir uma tarefa concluída limpa completed_at, pra caso ela seja
  -- retrabalhada e concluída de novo mais tarde
  IF NEW.status != 'concluida' AND OLD.status = 'concluida' THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS track_task_time ON tasks;
CREATE TRIGGER track_task_time
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION trg_track_task_time();
