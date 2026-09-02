-- ============================================================
-- Início e fim da tarefa, pra o compromisso nascer certo na agenda
-- (e no Google Calendar, que precisa de start E end explícitos).
--
-- Nomes propositalmente diferentes de started_at/completed_at: esses
-- são a execução real (time tracking), estes são o planejado.
--
-- due_date continua sendo o PRAZO. Uma tarefa pode ser executada
-- quarta 14h–15h e ter prazo sexta — são coisas diferentes.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end   TIMESTAMPTZ;

COMMENT ON COLUMN tasks.scheduled_start IS 'Início planejado — vira o start do evento na agenda.';
COMMENT ON COLUMN tasks.scheduled_end   IS 'Fim planejado — vira o end do evento na agenda.';

-- Fim nunca antes do início.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_scheduled_window_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_scheduled_window_check
  CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start);

CREATE OR REPLACE FUNCTION sync_task_to_event()
RETURNS trigger AS $$
DECLARE
  v_start    TIMESTAMPTZ;
  v_duration INT;
  v_should_exist BOOLEAN;
BEGIN
  -- Início: o agendado quando existir; senão o prazo com hora marcada.
  v_start := COALESCE(NEW.scheduled_start, CASE WHEN NEW.has_time THEN NEW.due_date END);

  v_should_exist :=
    v_start IS NOT NULL
    AND NEW.assignee_id IS NOT NULL
    AND NEW.status NOT IN ('concluida', 'cancelada');

  IF NOT v_should_exist THEN
    DELETE FROM events WHERE task_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Duração: janela agendada > horas estimadas > 1h. Mínimo de 15min pra
  -- não gerar bloco degenerado na agenda.
  v_duration := GREATEST(15, COALESCE(
    CASE WHEN NEW.scheduled_end IS NOT NULL
         THEN CEIL(EXTRACT(EPOCH FROM (NEW.scheduled_end - v_start)) / 60)::int END,
    ROUND(NEW.estimated_hours * 60)::int,
    60
  ));

  UPDATE events
     SET title           = NEW.title,
         start_at        = v_start,
         duration_min    = v_duration,
         agenda          = NEW.notes,
         project_id      = NEW.project_id,
         lead_id         = NEW.lead_id,
         created_by      = NEW.assignee_id,
         participant_ids = ARRAY[NEW.assignee_id],
         -- zera o carimbo pro sincronizador reenviar ao Google
         google_synced_at = NULL,
         updated_at      = now()
   WHERE task_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO events (
      org_id, title, type, start_at, duration_min, participant_ids,
      lead_id, project_id, agenda, created_by, task_id
    ) VALUES (
      NEW.org_id, NEW.title, 'interno', v_start, v_duration, ARRAY[NEW.assignee_id],
      NEW.lead_id, NEW.project_id, NEW.notes, NEW.assignee_id, NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_task_to_event ON tasks;
CREATE TRIGGER trg_sync_task_to_event
AFTER INSERT OR UPDATE OF due_date, has_time, scheduled_start, scheduled_end, title, status,
                          assignee_id, estimated_hours, notes, project_id, lead_id
ON tasks
FOR EACH ROW EXECUTE FUNCTION sync_task_to_event();
