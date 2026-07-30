-- ============================================================
-- Integração com Google Calendar (sincronização de duas vias, por usuário)
-- ============================================================

CREATE TABLE google_calendar_connections (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         UUID REFERENCES organizations NOT NULL,
  user_id        UUID REFERENCES users NOT NULL UNIQUE,
  google_email   TEXT,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  token_expiry   TIMESTAMPTZ NOT NULL,
  calendar_id    TEXT NOT NULL DEFAULT 'primary',
  sync_enabled   BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_token     TEXT, -- Google Calendar incremental sync token
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê/gerencia a própria conexão
CREATE POLICY "google_conn_own" ON google_calendar_connections FOR ALL
  USING (user_id = auth.uid());

CREATE TRIGGER trg_google_conn_updated_at BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vincula eventos do CRM ao evento correspondente no Google Calendar
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sync_source TEXT NOT NULL DEFAULT 'crm'
  CHECK (sync_source IN ('crm', 'google'));

CREATE INDEX idx_events_google_event_id ON events(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE UNIQUE INDEX idx_events_google_unique ON events(created_by, google_event_id) WHERE google_event_id IS NOT NULL;
