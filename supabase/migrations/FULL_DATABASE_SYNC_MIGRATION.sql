-- ============================================================================
-- OPTERAOS — FULL DATABASE SYNC CONSOLIDATED MIGRATION
-- Project: zoyhmqerdehetsveyrjz
--
-- This migration brings the remote PostgreSQL database schema up to date with
-- all migrations from 20260811153000 through 20260821000000.
--
-- SAFETY GUARANTEES:
-- - Zero DROP TABLE / Zero DROP DATABASE statements
-- - Preserves all existing tables: organizations, organization_members, customers, deals, invoices
-- - Fully idempotent (uses IF NOT EXISTS, DO blocks, and policy checks)
-- - Enforces multi-tenant Row Level Security (RLS) on every table
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_stage') THEN
    CREATE TYPE public.lead_stage AS ENUM ('new', 'contacted', 'qualified', 'unqualified');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');
  END IF;
END;
$$;

-- ============================================================================
-- 2. LEADS TABLE (CRM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  source text,
  score integer NOT NULL DEFAULT 0,
  stage public.lead_stage NOT NULL DEFAULT 'new',
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer ON public.deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'members can view leads') THEN
    CREATE POLICY "members can view leads" ON public.leads FOR SELECT TO authenticated
      USING (public.is_org_member(org_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'members can insert leads') THEN
    CREATE POLICY "members can insert leads" ON public.leads FOR INSERT TO authenticated
      WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'members can update leads') THEN
    CREATE POLICY "members can update leads" ON public.leads FOR UPDATE TO authenticated
      USING (public.is_org_member(org_id, auth.uid()))
      WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'admins can delete leads') THEN
    CREATE POLICY "admins can delete leads" ON public.leads FOR DELETE TO authenticated
      USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- ============================================================================
-- 3. AI CORE TABLES (Conversations, Messages, Runs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  result jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_org ON public.ai_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_org ON public.ai_agent_runs(org_id);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'members can view ai_conversations') THEN
    CREATE POLICY "members can view ai_conversations" ON public.ai_conversations FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'members can insert ai_conversations') THEN
    CREATE POLICY "members can insert ai_conversations" ON public.ai_conversations FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_messages' AND policyname = 'members can view ai_messages') THEN
    CREATE POLICY "members can view ai_messages" ON public.ai_messages FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_messages' AND policyname = 'members can insert ai_messages') THEN
    CREATE POLICY "members can insert ai_messages" ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_agent_runs' AND policyname = 'members can view ai_agent_runs') THEN
    CREATE POLICY "members can view ai_agent_runs" ON public.ai_agent_runs FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_agent_runs' AND policyname = 'members can insert ai_agent_runs') THEN
    CREATE POLICY "members can insert ai_agent_runs" ON public.ai_agent_runs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
END;
$$;

GRANT ALL ON public.ai_conversations TO authenticated, service_role;
GRANT ALL ON public.ai_messages TO authenticated, service_role;
GRANT ALL ON public.ai_agent_runs TO authenticated, service_role;

-- ============================================================================
-- 4. DEPARTMENTS & TEAMS (Enterprise Organization Hierarchy)
-- ============================================================================
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

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'members can view departments') THEN
    CREATE POLICY "members can view departments" ON public.departments FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'admins can manage departments') THEN
    CREATE POLICY "admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'members can view teams') THEN
    CREATE POLICY "members can view teams" ON public.teams FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'admins can manage teams') THEN
    CREATE POLICY "admins can manage teams" ON public.teams FOR ALL TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
  END IF;
END;
$$;

GRANT ALL ON public.departments TO authenticated, service_role;
GRANT ALL ON public.teams TO authenticated, service_role;

-- ============================================================================
-- 5. WORK GROUPS & CUSTOMER GROUPS (Autopilot Foundation)
-- ============================================================================
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

CREATE TABLE IF NOT EXISTS public.customer_group_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES public.customer_groups(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  added_by    uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, customer_id)
);

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

ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_groups' AND policyname = 'customer_groups_org_member') THEN
    CREATE POLICY customer_groups_org_member ON public.customer_groups FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_group_members' AND policyname = 'cgm_org_member') THEN
    CREATE POLICY cgm_org_member ON public.customer_group_members FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_groups' AND policyname = 'work_groups_org_member') THEN
    CREATE POLICY work_groups_org_member ON public.work_groups FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'work_group_members' AND policyname = 'wgm_org_member') THEN
    CREATE POLICY wgm_org_member ON public.work_group_members FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assignment_rules' AND policyname = 'ar_org_member') THEN
    CREATE POLICY ar_org_member ON public.assignment_rules FOR ALL TO authenticated
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()))
      WITH CHECK (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;
END;
$$;

GRANT ALL ON public.customer_groups TO authenticated, service_role;
GRANT ALL ON public.customer_group_members TO authenticated, service_role;
GRANT ALL ON public.work_groups TO authenticated, service_role;
GRANT ALL ON public.work_group_members TO authenticated, service_role;
GRANT ALL ON public.assignment_rules TO authenticated, service_role;

-- ============================================================================
-- 6. WORKFLOWS & AUTOPILOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'custom' CHECK (category IN ('sales', 'customer_success', 'finance', 'management', 'marketing', 'operations', 'custom')),
  is_autopilot boolean NOT NULL DEFAULT true,
  human_summary text,
  goal_prompt text,
  schedule text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  execution_stats jsonb NOT NULL DEFAULT '{"total": 0, "successful": 0, "failed": 0, "last_executed": null}'::jsonb,
  customer_group_id uuid REFERENCES public.customer_groups(id) ON DELETE SET NULL,
  target_work_group_id uuid REFERENCES public.work_groups(id) ON DELETE SET NULL,
  assignment_strategy text DEFAULT 'round_robin',
  webhook_url text,
  created_by uuid,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'successful', 'failed', 'cancelled')),
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  duration_ms integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Workflow Execution Logs Table
CREATE TABLE IF NOT EXISTS public.workflow_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id text,
  node_name text,
  node_type text,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'successful', 'failed', 'skipped')),
  input_data jsonb DEFAULT '{}'::jsonb,
  output_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  duration_ms integer DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON public.workflows(org_id, category);
CREATE INDEX IF NOT EXISTS idx_wf_exec_org ON public.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_wf ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_logs ON public.workflow_execution_logs(execution_id);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflows' AND policyname = 'members can view workflows') THEN
    CREATE POLICY "members can view workflows" ON public.workflows FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflows' AND policyname = 'members can insert workflows') THEN
    CREATE POLICY "members can insert workflows" ON public.workflows FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflows' AND policyname = 'members can update workflows') THEN
    CREATE POLICY "members can update workflows" ON public.workflows FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflows' AND policyname = 'members can delete workflows') THEN
    CREATE POLICY "members can delete workflows" ON public.workflows FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_executions' AND policyname = 'members can view workflow_executions') THEN
    CREATE POLICY "members can view workflow_executions" ON public.workflow_executions FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_executions' AND policyname = 'members can insert workflow_executions') THEN
    CREATE POLICY "members can insert workflow_executions" ON public.workflow_executions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_execution_logs' AND policyname = 'members can view workflow_execution_logs') THEN
    CREATE POLICY "members can view workflow_execution_logs" ON public.workflow_execution_logs FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_execution_logs' AND policyname = 'members can insert workflow_execution_logs') THEN
    CREATE POLICY "members can insert workflow_execution_logs" ON public.workflow_execution_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
END;
$$;

GRANT ALL ON public.workflows TO authenticated, service_role;
GRANT ALL ON public.workflow_executions TO authenticated, service_role;
GRANT ALL ON public.workflow_execution_logs TO authenticated, service_role;

-- ============================================================================
-- 7. TASKS & UNIFIED WORK ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date date,
  status text NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Completed', 'Cancelled')),
  work_type text NOT NULL DEFAULT 'task' CHECK (work_type IN ('task', 'lead_follow_up', 'customer_follow_up', 'invoice_follow_up', 'approval', 'escalation', 'report_generation', 'ai_action', 'communication')),
  work_group_id uuid REFERENCES public.work_groups(id) ON DELETE SET NULL,
  customer_group_id uuid REFERENCES public.customer_groups(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'autopilot', 'ai_command', 'escalation', 'scheduled')),
  autopilot_id uuid REFERENCES public.workflows(id) ON DELETE SET NULL,
  outcome_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_by uuid,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_work_group ON public.tasks(org_id, work_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(org_id, source);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'members can view tasks') THEN
    CREATE POLICY "members can view tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'members can insert tasks') THEN
    CREATE POLICY "members can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'members can update tasks') THEN
    CREATE POLICY "members can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'admins can delete tasks') THEN
    CREATE POLICY "admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
END;
$$;

GRANT ALL ON public.tasks TO authenticated, service_role;

-- ============================================================================
-- 8. ACTIVITIES & NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'note', 'follow_up', 'status_change')),
  title text NOT NULL,
  description text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('task_assigned', 'task_overdue', 'lead_new', 'deal_update', 'invoice_overdue', 'automation_failure', 'ai_action_required', 'system_alert', 'info')),
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON public.notifications(org_id, user_id);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'members can view activities') THEN
    CREATE POLICY "members can view activities" ON public.activities FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'members can insert activities') THEN
    CREATE POLICY "members can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'members can delete activities') THEN
    CREATE POLICY "members can delete activities" ON public.activities FOR DELETE TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'users can view notifications') THEN
    CREATE POLICY "users can view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()) AND user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'users can update notifications') THEN
    CREATE POLICY "users can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid()) AND user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'members can insert notifications') THEN
    CREATE POLICY "members can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'users can delete notifications') THEN
    CREATE POLICY "users can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END;
$$;

GRANT ALL ON public.activities TO authenticated, service_role;
GRANT ALL ON public.notifications TO authenticated, service_role;

-- ============================================================================
-- 9. INVOICE LINE ITEMS, PAYMENTS, AND TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  provider text NOT NULL DEFAULT 'razorpay',
  provider_payment_id text,
  provider_order_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'processed' CHECK (status IN ('received', 'processed', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_registration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  expires_at timestamptz NOT NULL,
  max_uses integer DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_registration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invite_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items' AND policyname = 'members can view invoice_line_items') THEN
    CREATE POLICY "members can view invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_records' AND policyname = 'members can view payment_records') THEN
    CREATE POLICY "members can view payment_records" ON public.payment_records FOR ALL TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_registration_tokens' AND policyname = 'members can manage tokens') THEN
    CREATE POLICY "members can manage tokens" ON public.customer_registration_tokens FOR ALL TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_invite_links' AND policyname = 'members can manage invite links') THEN
    CREATE POLICY "members can manage invite links" ON public.organization_invite_links FOR ALL TO authenticated USING (public.is_org_member(org_id, auth.uid()));
  END IF;
END;
$$;

GRANT ALL ON public.invoice_line_items TO authenticated, service_role;
GRANT ALL ON public.payment_records TO authenticated, service_role;
GRANT ALL ON public.webhook_events TO authenticated, service_role;
GRANT ALL ON public.customer_registration_tokens TO authenticated, service_role;
GRANT ALL ON public.organization_invite_links TO authenticated, service_role;
