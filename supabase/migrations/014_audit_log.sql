-- ============================================================
-- Auditoria: log de ações (criação/edição/exclusão) nas tabelas
-- principais + registro de login, visível só para administradores.
-- ============================================================

CREATE TABLE audit_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       UUID REFERENCES organizations NOT NULL,
  actor_id     UUID REFERENCES users ON DELETE SET NULL,
  actor_name   TEXT,
  actor_email  TEXT,
  action       TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'login')),
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  entity_label TEXT,
  changes      JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Só admin da org enxerga o log
CREATE POLICY "audit_admin_select" ON audit_logs FOR SELECT
  USING (
    org_id = get_user_org_id()
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Qualquer usuário autenticado pode registrar o próprio login
CREATE POLICY "audit_insert_own_login" ON audit_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid() AND org_id = get_user_org_id() AND action = 'login');

-- ============================================================
-- Trigger genérico de auditoria (criar/editar/excluir)
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_org_id UUID;
  v_entity_label TEXT;
  v_row JSONB;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NOT NULL THEN
    SELECT full_name, email INTO v_actor_name, v_actor_email FROM users WHERE id = v_actor;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
    v_org_id := (v_row->>'org_id')::UUID;
    v_entity_label := COALESCE(v_row->>'name', v_row->>'title', v_row->>'description', v_row->>'full_name', v_row->>'code', OLD.id::text);
    INSERT INTO audit_logs (org_id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_label, changes)
    VALUES (v_org_id, v_actor, v_actor_name, v_actor_email, 'deleted', TG_TABLE_NAME, OLD.id, v_entity_label, v_row);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW);
    v_org_id := (v_row->>'org_id')::UUID;
    v_entity_label := COALESCE(v_row->>'name', v_row->>'title', v_row->>'description', v_row->>'full_name', v_row->>'code', NEW.id::text);
    INSERT INTO audit_logs (org_id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_label, changes)
    VALUES (v_org_id, v_actor, v_actor_name, v_actor_email, 'created', TG_TABLE_NAME, NEW.id, v_entity_label, v_row);
    RETURN NEW;
  ELSE
    v_row := to_jsonb(NEW);
    v_org_id := (v_row->>'org_id')::UUID;
    v_entity_label := COALESCE(v_row->>'name', v_row->>'title', v_row->>'description', v_row->>'full_name', v_row->>'code', NEW.id::text);
    INSERT INTO audit_logs (org_id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_label, changes)
    VALUES (v_org_id, v_actor, v_actor_name, v_actor_email, 'updated', TG_TABLE_NAME, NEW.id, v_entity_label,
      jsonb_build_object('before', to_jsonb(OLD), 'after', v_row));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','companies','contacts','leads','proposals','projects','revenues','expenses','tasks','events'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION log_audit_change()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Usuários da org com último login (join com auth.users, só admin)
-- ============================================================
CREATE OR REPLACE FUNCTION get_org_users_with_activity()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  IF (SELECT u.role FROM users u WHERE u.id = auth.uid()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.created_at, au.last_sign_in_at
  FROM users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.org_id = get_user_org_id()
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_org_users_with_activity() TO authenticated;
