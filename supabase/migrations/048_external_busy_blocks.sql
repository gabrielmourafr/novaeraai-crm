-- ============================================================
-- Agenda pessoal do Google não pode virar evento do CRM.
--
-- O que estava acontecendo:
--  1. O pull gravava TUDO do Google Calendar de cada pessoa dentro de
--     public.events. Resultado: 956 linhas, 924 delas da agenda pessoal
--     de um único usuário, com recorrências expandidas até 2056 — e os
--     títulos pessoais visíveis pra organização inteira.
--  2. Pior: um evento do CRM que ia pro Google voltava no pull seguinte
--     e era SOBRESCRITO com sync_source='google', type='outro',
--     participant_ids=[], lead_id=NULL, project_id=NULL. Ou seja, todo
--     evento sincronizado era destruído logo depois.
--
-- Correção estrutural: o que vem do Google passa a viver numa tabela
-- própria, usada só pra calcular ocupação na disponibilidade. Nunca
-- aparece como evento do CRM e nunca sobrescreve nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS external_busy_blocks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  title           TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  is_all_day      BOOLEAN NOT NULL DEFAULT false,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, google_event_id)
);

CREATE INDEX IF NOT EXISTS idx_busy_user_window ON external_busy_blocks(user_id, start_at, end_at);

ALTER TABLE external_busy_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS busy_blocks_org_access ON external_busy_blocks;
CREATE POLICY busy_blocks_org_access ON external_busy_blocks
  FOR ALL
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- ── Migra o que já foi importado, sem perder ocupação ──
INSERT INTO external_busy_blocks (org_id, user_id, google_event_id, title, start_at, end_at)
SELECT e.org_id, e.created_by, e.google_event_id, e.title,
       e.start_at, e.start_at + (COALESCE(e.duration_min, 60) || ' minutes')::interval
  FROM events e
 WHERE e.sync_source = 'google'
   AND e.task_id IS NULL
   AND e.created_by IS NOT NULL
   AND e.google_event_id IS NOT NULL
ON CONFLICT (user_id, google_event_id) DO NOTHING;

-- Espelhos de tarefa foram marcados como 'google' pelo pull: devolve.
UPDATE events SET sync_source = 'crm' WHERE task_id IS NOT NULL;

-- Tira da agenda do CRM tudo que é da agenda pessoal — a informação de
-- ocupação foi preservada acima e o conteúdo original segue no Google.
DELETE FROM events WHERE sync_source = 'google' AND task_id IS NULL;
