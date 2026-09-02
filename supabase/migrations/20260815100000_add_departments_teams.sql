-- ============================================================================
-- Migration: Enterprise Organization Hierarchy
-- Adds departments, teams, and extends organization_members for enterprise
-- company structures (1 employee → 10,000+ employees).
--
-- Hierarchy:
--   Organization
--     └── Departments (e.g. Sales, Marketing, Finance)
--           └── Teams (e.g. SMB Sales, Enterprise Sales)
--                 └── Members (employees assigned to a team)
-- ============================================================================

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TRIGGER departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. EXTEND organization_members WITH ENTERPRISE COLUMNS
-- Uses IF NOT EXISTS via DO block to be idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'organization_members'
      AND column_name  = 'department_id'
  ) THEN
    ALTER TABLE public.organization_members
      ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'organization_members'
      AND column_name  = 'team_id'
  ) THEN
    ALTER TABLE public.organization_members
      ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'organization_members'
      AND column_name  = 'job_title'
  ) THEN
    ALTER TABLE public.organization_members
      ADD COLUMN job_title text;
  END IF;
END;
$$;

-- 4. EXTEND leads WITH TEAM OWNERSHIP (team-based lead assignment)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leads'
      AND column_name  = 'team_id'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leads'
      AND column_name  = 'department_id'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- 5. EXTEND customers WITH TEAM OWNERSHIP
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'customers'
      AND column_name  = 'team_id'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'customers'
      AND column_name  = 'industry'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN industry text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'customers'
      AND column_name  = 'segment'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN segment text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'customers'
      AND column_name  = 'city'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'customers'
      AND column_name  = 'lifetime_value'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN lifetime_value numeric(14,2) DEFAULT 0;
  END IF;
END;
$$;

-- 6. EXTEND deals WITH TEAM OWNERSHIP
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'deals'
      AND column_name  = 'owner_id'
  ) THEN
    ALTER TABLE public.deals
      ADD COLUMN owner_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'deals'
      AND column_name  = 'team_id'
  ) THEN
    ALTER TABLE public.deals
      ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- 7. EXTEND tasks WITH TEAM ASSIGNMENT (team_id for bulk assignment)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'team_id'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- 8. EXTEND workflows WITH TEAM TARGETING
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'workflows'
      AND column_name  = 'target_team_id'
  ) THEN
    ALTER TABLE public.workflows
      ADD COLUMN target_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'workflows'
      AND column_name  = 'target_department_id'
  ) THEN
    ALTER TABLE public.workflows
      ADD COLUMN target_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'workflows'
      AND column_name  = 'assignment_strategy'
  ) THEN
    ALTER TABLE public.workflows
      ADD COLUMN assignment_strategy text DEFAULT 'direct'
        CHECK (assignment_strategy IN ('direct', 'round_robin', 'workload', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'workflows'
      AND column_name  = 'conditions'
  ) THEN
    ALTER TABLE public.workflows
      ADD COLUMN conditions jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END;
$$;

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_departments_org ON public.departments(org_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON public.teams(org_id);
CREATE INDEX IF NOT EXISTS idx_teams_dept ON public.teams(department_id);
CREATE INDEX IF NOT EXISTS idx_members_dept ON public.organization_members(department_id);
CREATE INDEX IF NOT EXISTS idx_members_team ON public.organization_members(team_id);
CREATE INDEX IF NOT EXISTS idx_leads_team ON public.leads(team_id);
CREATE INDEX IF NOT EXISTS idx_customers_team ON public.customers(team_id);

-- 10. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.departments TO service_role;
GRANT ALL ON public.teams TO service_role;

-- 11. RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Departments: visible to all org members, manageable by admins
CREATE POLICY "members can view departments"
  ON public.departments FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "admins can insert departments"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can update departments"
  ON public.departments FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can delete departments"
  ON public.departments FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- Teams: visible to all org members, manageable by admins
CREATE POLICY "members can view teams"
  ON public.teams FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "admins can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
