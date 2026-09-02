-- ============================================================
-- Tarefa com horário vira compromisso na agenda.
--
-- tasks.due_date já é TIMESTAMPTZ (guarda hora); o que faltava era
-- (a) marcar se a hora foi escolhida de propósito e (b) refletir isso
-- num evento da agenda, que é o que alimenta o painel de
-- disponibilidade e o push pro Google Calendar.
--
-- O evento nasce com created_by = responsável pela tarefa, e não quem
-- criou: o push pro Google filtra por created_by, então sem isso o
-- compromisso cairia na agenda de quem delegou em vez da agenda de
-- quem executa.
--
-- Aditivo: nenhuma tarefa nem evento existente é alterado.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS has_time BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tasks.has_time IS
  'true quando o usuário escolheu um horário (e não só a data) — dispara o espelho na agenda.';

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_task_id ON events(task_id) WHERE task_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_task_to_event()
RETURNS trigger AS $$
DECLARE
  v_duration INT;
  v_should_exist BOOLEAN;
BEGIN
  -- Só vira compromisso se tem horário marcado, está em aberto e tem dono.
  v_should_exist :=
    NEW.has_time
    AND NEW.due_date IS NOT NULL
    AND NEW.assignee_id IS NOT NULL
    AND NEW.status NOT IN ('concluida', 'cancelada');

  IF NOT v_should_exist THEN
    DELETE FROM events WHERE task_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Duração: horas estimadas quando existirem, senão 1h. Mínimo de 15min
  -- pra não gerar bloco degenerado na agenda.
  v_duration := GREATEST(15, COALESCE(ROUND(NEW.estimated_hours * 60)::int, 60));

  UPDATE events
     SET title           = NEW.title,
         start_at        = NEW.due_date,
         duration_min    = v_duration,
         agenda          = NEW.notes,
         project_id      = NEW.project_id,
         lead_id         = NEW.lead_id,
         created_by      = NEW.assignee_id,
         participant_ids = ARRAY[NEW.assignee_id],
         updated_at      = now()
   WHERE task_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO events (
      org_id, title, type, start_at, duration_min, participant_ids,
      lead_id, project_id, agenda, created_by, task_id
    ) VALUES (
      NEW.org_id, NEW.title, 'interno', NEW.due_date, v_duration, ARRAY[NEW.assignee_id],
      NEW.lead_id, NEW.project_id, NEW.notes, NEW.assignee_id, NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_task_to_event ON tasks;
CREATE TRIGGER trg_sync_task_to_event
AFTER INSERT OR UPDATE OF due_date, has_time, title, status, assignee_id, estimated_hours, notes, project_id, lead_id
ON tasks
FOR EACH ROW EXECUTE FUNCTION sync_task_to_event();
