-- ============================================================================
-- OPTERAOS — FRAGMENT 2: CORE BUSINESS PLATFORM SCHEMA MIGRATION
-- Multi-Tenant Core Foundation: Organizations, Users, Members, Teams,
-- Departments, Employees, Companies, Contacts, Addresses, Tags, Custom Fields,
-- Universal Activities, Comments, Attachments, Notifications, and Audit Logs
-- ============================================================================

-- ── 1. ENUMS ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status') THEN
    CREATE TYPE public.activity_status AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_priority') THEN
    CREATE TYPE public.activity_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
    CREATE TYPE public.notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_type') THEN
    CREATE TYPE public.actor_type AS ENUM ('USER', 'API', 'AUTOPILOT', 'SYSTEM', 'INTEGRATION');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_type') THEN
    CREATE TYPE public.contact_type AS ENUM ('INDIVIDUAL', 'COMPANY_CONTACT', 'PROSPECT', 'CUSTOMER', 'VENDOR', 'PARTNER', 'EMPLOYEE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'address_type') THEN
    CREATE TYPE public.address_type AS ENUM ('BILLING', 'SHIPPING', 'OFFICE', 'HOME', 'CONTACT', 'OTHER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_field_type') THEN
    CREATE TYPE public.custom_field_type AS ENUM ('TEXT', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'SELECT', 'MULTI_SELECT', 'RELATION', 'URL', 'EMAIL');
  END IF;
END;
$$;

-- ── 2. AUGMENT ORGANIZATIONS ─────────────────────────────────────────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS fiscal_settings jsonb,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS tax_config jsonb;

-- ── 3. AUGMENT USERS ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
      ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';
  END IF;
END $$;

-- ── 4. AUGMENT ORGANIZATION MEMBERS ──────────────────────────────────────────
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS manager_id uuid;

-- ── 5. AUGMENT DEPARTMENTS & TEAMS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id uuid,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS parent_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_department_id);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id uuid,
  name text NOT NULL,
  description text,
  team_type text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS manager_id uuid,
  ADD COLUMN IF NOT EXISTS team_type text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_teams_org ON public.teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_dept ON public.teams(department_id);

-- ── 6. TEAM MEMBERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid,
  employee_id uuid,
  role text NOT NULL DEFAULT 'MEMBER',
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_emp ON public.team_members(employee_id);

-- ── 7. AUGMENT EMPLOYEES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  manager_id uuid,
  employee_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text,
  work_email text,
  personal_email text,
  phone text,
  job_title text NOT NULL,
  employment_type text NOT NULL DEFAULT 'FULL_TIME',
  employment_status text NOT NULL DEFAULT 'ACTIVE',
  hire_date timestamptz NOT NULL DEFAULT now(),
  joining_date timestamptz,
  exit_date timestamptz,
  location text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  skills_metadata jsonb,
  avatar_url text,
  salary numeric(12, 2),
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_employee_org_number UNIQUE (organization_id, employee_number)
);

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS work_email text,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id uuid,
  ADD COLUMN IF NOT EXISTS employment_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS joining_date timestamptz,
  ADD COLUMN IF NOT EXISTS exit_date timestamptz,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS skills_metadata jsonb,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_team ON public.employees(team_id);

-- ── 8. COMPANIES / BUSINESS ENTITIES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  legal_name text NOT NULL,
  display_name text NOT NULL,
  tax_identifiers jsonb,
  registration_identifiers jsonb,
  industry text,
  company_size text,
  website text,
  email text,
  phone text,
  relationship_type text NOT NULL DEFAULT 'CUSTOMER',
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  custom_fields jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_org ON public.companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_parent ON public.companies(parent_company_id);

-- ── 9. CONTACTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  type public.contact_type NOT NULL DEFAULT 'INDIVIDUAL',
  first_name text NOT NULL,
  last_name text,
  name text NOT NULL,
  email text,
  phone text,
  mobile text,
  job_title text,
  website text,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  language text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'ACTIVE',
  custom_fields jsonb,
  created_by_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);

-- ── 10. ADDRESSES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  address_type public.address_type NOT NULL DEFAULT 'OFFICE',
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'IN',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_org ON public.addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_addresses_entity ON public.addresses(entity_type, entity_id);

-- ── 11. TAGS & ENTITY TAGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366F1',
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tags_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_org ON public.tags(organization_id);

CREATE TABLE IF NOT EXISTS public.entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_org ON public.entity_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON public.entity_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);

-- ── 12. CUSTOM FIELDS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type public.custom_field_type NOT NULL DEFAULT 'TEXT',
  is_required boolean NOT NULL DEFAULT false,
  default_value text,
  options jsonb,
  validation_rules jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_custom_fields_org_key UNIQUE (organization_id, entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_org ON public.custom_field_definitions(organization_id);

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  value_text text,
  value_number numeric(15, 4),
  value_boolean boolean,
  value_date timestamptz,
  value_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_custom_field_vals UNIQUE (field_definition_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_vals_field ON public.custom_field_values(field_definition_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_vals_entity ON public.custom_field_values(entity_type, entity_id);

-- ── 13. COMMENTS & ATTACHMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  mentions jsonb,
  is_edited boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_org ON public.comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);

CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_key text NOT NULL,
  storage_provider text NOT NULL DEFAULT 'supabase',
  uploaded_by_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_org ON public.attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON public.attachments(uploaded_by_id);

-- ── 14. AUGMENT ACTIVITIES, NOTIFICATIONS & AUDIT LOGS ───────────────────────
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS completed_by_id uuid,
  ADD COLUMN IF NOT EXISTS status public.activity_status NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS priority public.activity_priority NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_assigned ON public.activities(assigned_user_id);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority public.notification_priority NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text;

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_type public.actor_type NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS old_state jsonb,
  ADD COLUMN IF NOT EXISTS new_state jsonb,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON public.audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource, resource_id);

-- ── 15. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────────
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Generic org member access policy generator
  PERFORM 1;
END $$;
