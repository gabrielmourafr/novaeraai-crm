-- ============================================================
-- Nova Era AI CRM — Schema Inicial
-- Execute no Supabase SQL Editor (ordem importa!)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  logo_url   TEXT,
  settings   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. USERS (extends auth.users)
-- ============================================================
CREATE TABLE users (
  id         UUID REFERENCES auth.users PRIMARY KEY,
  org_id     UUID REFERENCES organizations NOT NULL,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  avatar_url TEXT,
  role       TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. COMPANIES
-- ============================================================
CREATE TABLE companies (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id             UUID REFERENCES organizations NOT NULL,
  name               TEXT NOT NULL,
  trade_name         TEXT,
  cnpj               TEXT,
  segment            TEXT,
  size               TEXT CHECK (size IN ('mei','me','epp','media','grande')),
  estimated_revenue  DECIMAL(12,2),
  digital_maturity   TEXT CHECK (digital_maturity IN ('basica','intermediaria','avancada')),
  website            TEXT,
  address            TEXT,
  notes              TEXT,
  tags               TEXT[] DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  created_by         UUID REFERENCES users
);

-- ============================================================
-- 4. CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID REFERENCES organizations NOT NULL,
  company_id    UUID REFERENCES companies,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  job_title     TEXT,
  decision_role TEXT CHECK (decision_role IN ('decisor','influenciador','tecnico','usuario')),
  linkedin      TEXT,
  origin        TEXT,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID REFERENCES users
);

-- ============================================================
-- 5. PIPELINES
-- ============================================================
CREATE TABLE pipelines (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID REFERENCES organizations NOT NULL,
  name          TEXT NOT NULL,
  business_unit TEXT NOT NULL CHECK (business_unit IN ('labs','advisory','enterprise')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. PIPELINE STAGES
-- ============================================================
CREATE TABLE pipeline_stages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID REFERENCES pipelines ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  color       TEXT DEFAULT '#0B87C3',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. LEADS
-- ============================================================
CREATE TABLE leads (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id              UUID REFERENCES organizations NOT NULL,
  title               TEXT NOT NULL,
  company_id          UUID REFERENCES companies,
  contact_id          UUID REFERENCES contacts,
  pipeline_id         UUID REFERENCES pipelines NOT NULL,
  stage_id            UUID REFERENCES pipeline_stages NOT NULL,
  business_unit       TEXT CHECK (business_unit IN ('labs','advisory','enterprise')),
  value               DECIMAL(12,2),
  probability         INTEGER CHECK (probability BETWEEN 0 AND 100),
  origin              TEXT,
  assignee_id         UUID REFERENCES users,
  next_followup       TIMESTAMPTZ,
  temperature         TEXT CHECK (temperature IN ('frio','morno','quente')),
  expected_close_date DATE,
  closed_at           TIMESTAMPTZ,
  loss_reason         TEXT,
  notes               TEXT,
  tags                TEXT[] DEFAULT '{}',
  archived            BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  created_by          UUID REFERENCES users
);

-- ============================================================
-- 8. PRODUCTS (Catálogo)
-- ============================================================
CREATE TABLE products (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID REFERENCES organizations NOT NULL,
  name          TEXT NOT NULL,
  business_unit TEXT NOT NULL CHECK (business_unit IN ('labs','advisory','enterprise')),
  category      TEXT NOT NULL CHECK (category IN ('saas_plan','workshop','consultoria','projeto','programa')),
  description   TEXT,
  base_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  recurrence    TEXT NOT NULL CHECK (recurrence IN ('mensal','trimestral','anual','pontual')) DEFAULT 'pontual',
  status        TEXT NOT NULL CHECK (status IN ('ativo','inativo','desenvolvimento')) DEFAULT 'ativo',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. PROPOSALS
-- ============================================================
CREATE TABLE proposals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID REFERENCES organizations NOT NULL,
  number        TEXT NOT NULL,
  lead_id       UUID REFERENCES leads,
  company_id    UUID REFERENCES companies,
  contact_id    UUID REFERENCES contacts,
  business_unit TEXT NOT NULL CHECK (business_unit IN ('labs','advisory','enterprise')),
  discount      DECIMAL(10,2) DEFAULT 0,
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  valid_until   DATE,
  status        TEXT NOT NULL CHECK (status IN ('rascunho','enviada','visualizada','aceita','recusada','expirada')) DEFAULT 'rascunho',
  conditions    TEXT,
  template      TEXT,
  accepted_at   TIMESTAMPTZ,
  accepted_ip   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID REFERENCES users,
  UNIQUE(org_id, number)
);

-- ============================================================
-- 10. PROPOSAL ITEMS
-- ============================================================
CREATE TABLE proposal_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals ON DELETE CASCADE NOT NULL,
  product_id  UUID REFERENCES products,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  DECIMAL(12,2) NOT NULL,
  discount    DECIMAL(10,2) DEFAULT 0,
  subtotal    DECIMAL(12,2) NOT NULL
);

-- ============================================================
-- 11. PROPOSAL VIEWS (tracking)
-- ============================================================
CREATE TABLE proposal_views (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id      UUID REFERENCES proposals ON DELETE CASCADE NOT NULL,
  viewed_at        TIMESTAMPTZ DEFAULT now(),
  duration_seconds INTEGER,
  ip               TEXT
);

-- ============================================================
-- 12. PROJECTS
-- ============================================================
CREATE TABLE projects (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           UUID REFERENCES organizations NOT NULL,
  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  company_id       UUID REFERENCES companies NOT NULL,
  contact_id       UUID REFERENCES contacts,
  proposal_id      UUID REFERENCES proposals,
  lead_id          UUID REFERENCES leads,
  business_unit    TEXT NOT NULL CHECK (business_unit IN ('labs','advisory','enterprise')),
  program          TEXT,
  assignee_id      UUID REFERENCES users,
  status           TEXT NOT NULL CHECK (status IN ('kickoff','em_andamento','pausado','em_revisao','concluido','cancelado')) DEFAULT 'kickoff',
  start_date       DATE,
  expected_end_date DATE,
  end_date         DATE,
  contract_value   DECIMAL(12,2),
  progress         INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  description      TEXT,
  tags             TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES users,
  UNIQUE(org_id, code)
);

-- ============================================================
-- 13. PROJECT PHASES
-- ============================================================
CREATE TABLE project_phases (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL CHECK (status IN ('pendente','em_andamento','concluida')) DEFAULT 'pendente',
  start_date DATE,
  end_date   DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 14. PROJECT MILESTONES
-- ============================================================
CREATE TABLE project_milestones (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id   UUID REFERENCES project_phases ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  completed  BOOLEAN DEFAULT false,
  due_date   DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 15. DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES organizations NOT NULL,
  company_id  UUID REFERENCES companies NOT NULL,
  project_id  UUID REFERENCES projects,
  phase_id    UUID REFERENCES project_phases,
  lead_id     UUID REFERENCES leads,
  name        TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   INTEGER,
  file_type   TEXT,
  type        TEXT NOT NULL CHECK (type IN ('contrato','proposta','briefing','ata','apresentacao','entrega','nda','outro')) DEFAULT 'outro',
  version     INTEGER DEFAULT 1,
  description TEXT,
  tags        TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES users,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 16. REVENUES
-- ============================================================
CREATE TABLE revenues (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         UUID REFERENCES organizations NOT NULL,
  description    TEXT NOT NULL,
  company_id     UUID REFERENCES companies,
  contact_id     UUID REFERENCES contacts,
  proposal_id    UUID REFERENCES proposals,
  project_id     UUID REFERENCES projects,
  business_unit  TEXT NOT NULL CHECK (business_unit IN ('labs','advisory','enterprise')),
  value          DECIMAL(12,2) NOT NULL,
  due_date       DATE,
  paid_at        DATE,
  status         TEXT NOT NULL CHECK (status IN ('pendente','pago','atrasado','cancelado')) DEFAULT 'pendente',
  payment_method TEXT CHECK (payment_method IN ('pix','boleto','cartao','transferencia')),
  recurrence     TEXT NOT NULL CHECK (recurrence IN ('pontual','mensal','trimestral','anual')) DEFAULT 'pontual',
  category       TEXT NOT NULL CHECK (category IN ('assinatura','consultoria','projeto','workshop','outro')) DEFAULT 'outro',
  installment    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 17. EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES organizations NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('infraestrutura','saas','marketing','pessoal','imposto','outro')) DEFAULT 'outro',
  project_id  UUID REFERENCES projects,
  value       DECIMAL(12,2) NOT NULL,
  due_date    DATE,
  paid_at     DATE,
  status      TEXT NOT NULL CHECK (status IN ('pendente','pago','atrasado')) DEFAULT 'pendente',
  recurrence  TEXT NOT NULL CHECK (recurrence IN ('pontual','mensal','trimestral','anual')) DEFAULT 'pontual',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 18. TASKS
-- ============================================================
CREATE TABLE tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES organizations NOT NULL,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('followup','ligacao','email','reuniao','proposta','entrega','interno','outro')) DEFAULT 'outro',
  lead_id     UUID REFERENCES leads,
  contact_id  UUID REFERENCES contacts,
  company_id  UUID REFERENCES companies,
  proposal_id UUID REFERENCES proposals,
  project_id  UUID REFERENCES projects,
  phase_id    UUID REFERENCES project_phases,
  assignee_id UUID REFERENCES users,
  due_date    TIMESTAMPTZ,
  priority    TEXT NOT NULL CHECK (priority IN ('baixa','media','alta','urgente')) DEFAULT 'media',
  status      TEXT NOT NULL CHECK (status IN ('pendente','em_andamento','concluida','cancelada')) DEFAULT 'pendente',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES users
);

-- ============================================================
-- 19. EVENTS (Agenda)
-- ============================================================
CREATE TABLE events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES organizations NOT NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('demo','reuniao_exploratoria','followup','kickoff','review','interno','outro')) DEFAULT 'outro',
  start_at        TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER DEFAULT 60,
  participant_ids UUID[] DEFAULT '{}',
  contact_id      UUID REFERENCES contacts,
  lead_id         UUID REFERENCES leads,
  project_id      UUID REFERENCES projects,
  meeting_url     TEXT,
  agenda          TEXT,
  result          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by      UUID REFERENCES users
);

-- ============================================================
-- 20. ACTIVITIES (Timeline polimórfica)
-- ============================================================
CREATE TABLE activities (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES organizations NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead','contact','company','proposal','project','task','event')),
  entity_id   UUID NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('created','updated','stage_changed','note_added','file_uploaded','email_sent','call_made','meeting_held','proposal_sent','proposal_accepted','proposal_declined','task_completed')),
  description TEXT NOT NULL,
  metadata    JSONB,
  created_by  UUID REFERENCES users,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','contacts','leads','products','proposals','projects','revenues','expenses','tasks','events'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_leads_org_stage      ON leads(org_id, stage_id);
CREATE INDEX idx_leads_org_pipeline   ON leads(org_id, pipeline_id);
CREATE INDEX idx_leads_org_archived   ON leads(org_id, archived);
CREATE INDEX idx_tasks_org_assignee   ON tasks(org_id, assignee_id, status);
CREATE INDEX idx_tasks_due_date       ON tasks(org_id, due_date);
CREATE INDEX idx_activities_entity    ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_org       ON activities(org_id, created_at DESC);
CREATE INDEX idx_documents_company    ON documents(org_id, company_id);
CREATE INDEX idx_documents_project    ON documents(org_id, project_id);
CREATE INDEX idx_revenues_org_status  ON revenues(org_id, status);
CREATE INDEX idx_revenues_due_date    ON revenues(org_id, due_date);
CREATE INDEX idx_expenses_org_status  ON expenses(org_id, status);
CREATE INDEX idx_contacts_org         ON contacts(org_id, company_id);
CREATE INDEX idx_projects_org         ON projects(org_id, status);
CREATE INDEX idx_events_org_start     ON events(org_id, start_at);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_views   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities       ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies for org-scoped tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','contacts','pipelines','leads','products','proposals','projects','revenues','expenses','tasks','events','activities','documents'] LOOP
    EXECUTE format(
      'CREATE POLICY "org_access_%s" ON %s FOR ALL USING (org_id = get_user_org_id())',
      t, t
    );
  END LOOP;
END;
$$;

-- pipeline_stages — via pipeline
CREATE POLICY "org_access_pipeline_stages" ON pipeline_stages FOR ALL
  USING (pipeline_id IN (SELECT id FROM pipelines WHERE org_id = get_user_org_id()));

-- proposal_items — via proposal
CREATE POLICY "org_access_proposal_items" ON proposal_items FOR ALL
  USING (proposal_id IN (SELECT id FROM proposals WHERE org_id = get_user_org_id()));

-- proposal_views — via proposal
CREATE POLICY "org_access_proposal_views" ON proposal_views FOR ALL
  USING (proposal_id IN (SELECT id FROM proposals WHERE org_id = get_user_org_id()));

-- project_phases — via project
CREATE POLICY "org_access_project_phases" ON project_phases FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE org_id = get_user_org_id()));

-- project_milestones — via phase → project
CREATE POLICY "org_access_project_milestones" ON project_milestones FOR ALL
  USING (phase_id IN (
    SELECT pp.id FROM project_phases pp
    JOIN projects p ON pp.project_id = p.id
    WHERE p.org_id = get_user_org_id()
  ));

-- users — can read own org
CREATE POLICY "users_read_own_org" ON users FOR SELECT
  USING (org_id = get_user_org_id());

CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (id = auth.uid());

-- organizations — can read own
CREATE POLICY "org_read_own" ON organizations FOR SELECT
  USING (id = get_user_org_id());

-- ============================================================
-- HANDLE NEW USER TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_org_slug TEXT;
BEGIN
  SET LOCAL row_security = off;

  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    split_part(NEW.email, '@', 2)
  );
  v_org_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]', '-', 'g'));

  -- Ensure unique slug
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_org_slug) LOOP
    v_org_slug := v_org_slug || '-' || substring(gen_random_uuid()::text, 1, 4);
  END LOOP;

  INSERT INTO organizations (name, slug)
  VALUES (v_org_name, v_org_slug)
  RETURNING id INTO v_org_id;

  INSERT INTO users (id, org_id, full_name, email, role)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  );

  -- Seed default pipelines
  PERFORM seed_default_pipelines(v_org_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DEFAULT PIPELINES FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_pipelines(p_org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  -- Labs Pipeline
  INSERT INTO pipelines (org_id, name, business_unit)
  VALUES (p_org_id, 'Pipeline Labs', 'labs')
  RETURNING id INTO v_pipeline_id;

  INSERT INTO pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Novo Lead', 1, '#94A3B8'),
    (v_pipeline_id, 'Qualificação', 2, '#6366F1'),
    (v_pipeline_id, 'Demonstração', 3, '#0B87C3'),
    (v_pipeline_id, 'Proposta Enviada', 4, '#F59E0B'),
    (v_pipeline_id, 'Negociação', 5, '#F97316'),
    (v_pipeline_id, 'Fechado — Ganho', 6, '#10B981'),
    (v_pipeline_id, 'Fechado — Perdido', 7, '#EF4444');

  -- Advisory Pipeline
  INSERT INTO pipelines (org_id, name, business_unit)
  VALUES (p_org_id, 'Pipeline Advisory', 'advisory')
  RETURNING id INTO v_pipeline_id;

  INSERT INTO pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Prospecção', 1, '#94A3B8'),
    (v_pipeline_id, 'Reunião Exploratória', 2, '#6366F1'),
    (v_pipeline_id, 'Proposta de Consultoria', 3, '#0B87C3'),
    (v_pipeline_id, 'Negociação', 4, '#F59E0B'),
    (v_pipeline_id, 'Contrato Assinado', 5, '#10B981'),
    (v_pipeline_id, 'Upsell → Enterprise', 6, '#8B5CF6'),
    (v_pipeline_id, 'Fechado — Perdido', 7, '#EF4444');

  -- Enterprise Pipeline
  INSERT INTO pipelines (org_id, name, business_unit)
  VALUES (p_org_id, 'Pipeline Enterprise', 'enterprise')
  RETURNING id INTO v_pipeline_id;

  INSERT INTO pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Lead Qualificado', 1, '#94A3B8'),
    (v_pipeline_id, 'Discovery', 2, '#6366F1'),
    (v_pipeline_id, 'Proposta Técnica', 3, '#0B87C3'),
    (v_pipeline_id, 'Validação Executiva', 4, '#F59E0B'),
    (v_pipeline_id, 'Negociação', 5, '#F97316'),
    (v_pipeline_id, 'Fechado — Ganho', 6, '#10B981'),
    (v_pipeline_id, 'Fechado — Perdido', 7, '#EF4444');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUPABASE STORAGE — Documents bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg','image/png','application/zip']
);

CREATE POLICY "org_members_manage_documents"
ON storage.objects FOR ALL USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (SELECT org_id::text FROM users WHERE id = auth.uid())
);
