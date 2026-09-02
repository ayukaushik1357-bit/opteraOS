-- ============================================================================
-- Migration: OPTERAOS AUTOPILOT Core Schema
-- Migration ID: 20260821000000_create_autopilot_core_schema.sql
-- ============================================================================

-- 1. CUSTOMER GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.customer_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#6366F1',
  icon        text NOT NULL DEFAULT 'Users',
  criteria    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TRIGGER customer_groups_updated_at
  BEFORE UPDATE ON public.customer_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. CUSTOMER GROUP MEMBERS TABLE (Many-to-Many linking customers to groups)
CREATE TABLE IF NOT EXISTS public.customer_group_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  added_by    uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, customer_id)
);

-- 3. EMPLOYEE WORK GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.work_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  color               text NOT NULL DEFAULT '#8B5CF6',
  icon                text NOT NULL DEFAULT 'Briefcase',
  department_id       uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  assignment_strategy text NOT NULL DEFAULT 'round_robin'
    CHECK (assignment_strategy IN ('round_robin', 'lowest_workload', 'skill_based', 'ai_assignment', 'direct', 'all_members')),
  skills              text[] NOT NULL DEFAULT '{}',
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TRIGGER work_groups_updated_at
  BEFORE UPDATE ON public.work_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. WORK GROUP MEMBERS TABLE (Linking organization members to work groups)
CREATE TABLE IF NOT EXISTS public.work_group_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id     uuid NOT NULL REFERENCES public.work_groups(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  member_id    uuid REFERENCES public.organization_members(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'senior', 'member', 'specialist')),
  skills       text[] NOT NULL DEFAULT '{}',
  max_workload integer NOT NULL DEFAULT 15,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'away', 'offline', 'busy')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- 5. ASSIGNMENT RULES TABLE
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  event_type            text NOT NULL
    CHECK (event_type IN ('new_lead', 'new_customer', 'overdue_invoice', 'at_risk_customer', 'task_escalation', 'deal_stage_change', 'custom_event')),
  customer_group_id     uuid REFERENCES public.customer_groups(id) ON DELETE SET NULL,
  target_work_group_id  uuid REFERENCES public.work_groups(id) ON DELETE SET NULL,
  target_user_id        uuid,
  strategy              text NOT NULL DEFAULT 'round_robin'
    CHECK (strategy IN ('round_robin', 'lowest_workload', 'skill_based', 'ai_assignment', 'direct', 'all_members')),
  conditions            jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions               jsonb NOT NULL DEFAULT '[]'::jsonb,
  active                boolean NOT NULL DEFAULT true,
  priority              integer NOT NULL DEFAULT 10,
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER assignment_rules_updated_at
  BEFORE UPDATE ON public.assignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. EXTEND TASKS INTO UNIFIED WORK OBJECT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='work_type') THEN
    ALTER TABLE public.tasks ADD COLUMN work_type text NOT NULL DEFAULT 'task'
      CHECK (work_type IN ('task', 'lead_follow_up', 'customer_follow_up', 'invoice_follow_up', 'approval', 'escalation', 'report_generation', 'ai_action', 'communication'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='work_group_id') THEN
    ALTER TABLE public.tasks ADD COLUMN work_group_id uuid REFERENCES public.work_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='lead_id') THEN
    ALTER TABLE public.tasks ADD COLUMN lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='invoice_id') THEN
    ALTER TABLE public.tasks ADD COLUMN invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='customer_group_id') THEN
    ALTER TABLE public.tasks ADD COLUMN customer_group_id uuid REFERENCES public.customer_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='source') THEN
    ALTER TABLE public.tasks ADD COLUMN source text NOT NULL DEFAULT 'manual'
      CHECK (source IN ('manual', 'autopilot', 'ai_command', 'escalation', 'scheduled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='autopilot_id') THEN
    ALTER TABLE public.tasks ADD COLUMN autopilot_id uuid REFERENCES public.workflows(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='outcome_notes') THEN
    ALTER TABLE public.tasks ADD COLUMN outcome_notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='completed_by') THEN
    ALTER TABLE public.tasks ADD COLUMN completed_by uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='completed_at') THEN
    ALTER TABLE public.tasks ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='metadata') THEN
    ALTER TABLE public.tasks ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END;
$$;

-- 7. EXTEND WORKFLOWS WITH AUTOPILOT METADATA
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='category') THEN
    ALTER TABLE public.workflows ADD COLUMN category text NOT NULL DEFAULT 'custom'
      CHECK (category IN ('sales', 'customer_success', 'finance', 'management', 'marketing', 'operations', 'custom'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='is_autopilot') THEN
    ALTER TABLE public.workflows ADD COLUMN is_autopilot boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='customer_group_id') THEN
    ALTER TABLE public.workflows ADD COLUMN customer_group_id uuid REFERENCES public.customer_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='target_work_group_id') THEN
    ALTER TABLE public.workflows ADD COLUMN target_work_group_id uuid REFERENCES public.work_groups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='human_summary') THEN
    ALTER TABLE public.workflows ADD COLUMN human_summary text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='goal_prompt') THEN
    ALTER TABLE public.workflows ADD COLUMN goal_prompt text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='schedule') THEN
    ALTER TABLE public.workflows ADD COLUMN schedule text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='config') THEN
    ALTER TABLE public.workflows ADD COLUMN config jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' AND column_name='execution_stats') THEN
    ALTER TABLE public.workflows ADD COLUMN execution_stats jsonb NOT NULL DEFAULT '{"total": 0, "successful": 0, "failed": 0, "last_executed": null}'::jsonb;
  END IF;
END;
$$;

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_cg_org ON public.customer_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_cgm_group ON public.customer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_cgm_cust ON public.customer_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_wg_org ON public.work_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_wgm_group ON public.work_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_wgm_user ON public.work_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_org_event ON public.assignment_rules(org_id, event_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_tasks_work_type ON public.tasks(org_id, work_type);
CREATE INDEX IF NOT EXISTS idx_tasks_work_group ON public.tasks(org_id, work_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(org_id, source);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON public.workflows(org_id, category);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

-- Helper RLS condition macro: user is member of organization
DO $$
BEGIN
  -- Customer Groups
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_groups' AND policyname = 'customer_groups_org_member') THEN
    CREATE POLICY customer_groups_org_member ON public.customer_groups
      FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  -- Customer Group Members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_group_members' AND policyname = 'cgm_org_member') THEN
    CREATE POLICY cgm_org_member ON public.customer_group_members
      FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  -- Work Groups
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_groups' AND policyname = 'work_groups_org_member') THEN
    CREATE POLICY work_groups_org_member ON public.work_groups
      FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  -- Work Group Members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_group_members' AND policyname = 'wgm_org_member') THEN
    CREATE POLICY wgm_org_member ON public.work_group_members
      FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  -- Assignment Rules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_rules' AND policyname = 'ar_org_member') THEN
    CREATE POLICY ar_org_member ON public.assignment_rules
      FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;
END;
$$;

-- 10. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_rules TO authenticated;
GRANT ALL ON public.customer_groups TO service_role;
GRANT ALL ON public.customer_group_members TO service_role;
GRANT ALL ON public.work_groups TO service_role;
GRANT ALL ON public.work_group_members TO service_role;
GRANT ALL ON public.assignment_rules TO service_role;
