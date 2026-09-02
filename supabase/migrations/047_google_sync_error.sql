-- ============================================================
-- Falha de sincronização com o Google era silenciosa: o front chama
-- /api/calendar/sync com .catch(() => {}) e ninguém nunca sabia que
-- o token tinha morrido. As duas conexões existentes estão com
-- last_synced_at nulo desde julho — ou seja, nunca sincronizaram uma
-- única vez, e nada na tela indicava isso.
--
-- Guarda o último erro pra Integrações poder pedir a reconexão.
-- ============================================================

ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS sync_error    TEXT,
  ADD COLUMN IF NOT EXISTS sync_error_at TIMESTAMPTZ;

COMMENT ON COLUMN google_calendar_connections.sync_error IS
  'Último erro de sincronização. Nulo = última tentativa deu certo.';
