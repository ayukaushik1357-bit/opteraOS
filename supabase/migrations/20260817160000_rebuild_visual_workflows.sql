-- ============================================================================
-- Migration: Rebuild Visual Workflows Engine & Execution Logs
-- Migration ID: 20260817160000_rebuild_visual_workflows.sql
-- ============================================================================

-- 1. workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  trigger_type          text NOT NULL,
  trigger_config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  nodes                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  active                boolean NOT NULL DEFAULT true,
  version               integer NOT NULL DEFAULT 1,
  webhook_url           text,
  conditions            jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions               jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_team_id        uuid,
  target_department_id  uuid,
  assignment_strategy   text DEFAULT 'direct',
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  activated_at          timestamptz
);

-- Ensure newly added columns exist if table was partially created before
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS nodes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS edges jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 2. workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id     uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_event   text NOT NULL,
  status          text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'successful', 'failed', 'cancelled')),
  input_payload   jsonb DEFAULT '{}'::jsonb,
  output_payload  jsonb DEFAULT '{}'::jsonb,
  error_message   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  duration_ms     integer
);

ALTER TABLE public.workflow_executions ADD COLUMN IF NOT EXISTS duration_ms integer;

-- 3. workflow_execution_logs table (step-by-step node execution traces)
CREATE TABLE IF NOT EXISTS public.workflow_execution_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  execution_id    uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id         text NOT NULL,
  node_type       text NOT NULL,
  node_label      text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'successful', 'failed', 'skipped')),
  input           jsonb DEFAULT '{}'::jsonb,
  output          jsonb DEFAULT '{}'::jsonb,
  error_message   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  duration_ms     integer
);

-- 4. Trigger for auto updating updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'workflows_updated_at'
  ) THEN
    CREATE TRIGGER workflows_updated_at
      BEFORE UPDATE ON public.workflows
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- 5. Indexes for fast multi-tenant querying & execution tracing
CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org_trigger ON public.workflows(org_id, trigger_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_wf_exec_org ON public.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_wf ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_started ON public.workflow_executions(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_exec_logs_exec ON public.workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_logs_org ON public.workflow_execution_logs(org_id);

-- 6. Permissions and Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_execution_logs TO authenticated;
GRANT ALL ON public.workflows TO service_role;
GRANT ALL ON public.workflow_executions TO service_role;
GRANT ALL ON public.workflow_execution_logs TO service_role;

-- 7. Row Level Security (RLS)
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if existing to avoid conflicts
DROP POLICY IF EXISTS "members can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "members can insert workflows" ON public.workflows;
DROP POLICY IF EXISTS "members can update workflows" ON public.workflows;
DROP POLICY IF EXISTS "members can delete workflows" ON public.workflows;
DROP POLICY IF EXISTS "admins can insert workflows" ON public.workflows;
DROP POLICY IF EXISTS "admins can update workflows" ON public.workflows;
DROP POLICY IF EXISTS "admins can delete workflows" ON public.workflows;

DROP POLICY IF EXISTS "members can view workflow_executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "members can insert workflow_executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "members can update workflow_executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "members can delete workflow_executions" ON public.workflow_executions;

DROP POLICY IF EXISTS "members can view workflow_execution_logs" ON public.workflow_execution_logs;
DROP POLICY IF EXISTS "members can insert workflow_execution_logs" ON public.workflow_execution_logs;
DROP POLICY IF EXISTS "members can update workflow_execution_logs" ON public.workflow_execution_logs;
DROP POLICY IF EXISTS "members can delete workflow_execution_logs" ON public.workflow_execution_logs;

-- Workflow Policies
CREATE POLICY "members can view workflows"
  ON public.workflows FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert workflows"
  ON public.workflows FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can update workflows"
  ON public.workflows FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can delete workflows"
  ON public.workflows FOR DELETE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- Workflow Executions Policies
CREATE POLICY "members can view workflow_executions"
  ON public.workflow_executions FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert workflow_executions"
  ON public.workflow_executions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can update workflow_executions"
  ON public.workflow_executions FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

-- Workflow Execution Logs Policies
CREATE POLICY "members can view workflow_execution_logs"
  ON public.workflow_execution_logs FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert workflow_execution_logs"
  ON public.workflow_execution_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can update workflow_execution_logs"
  ON public.workflow_execution_logs FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
