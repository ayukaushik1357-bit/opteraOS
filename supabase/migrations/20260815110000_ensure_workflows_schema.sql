-- ============================================================================
-- Migration: Ensure Workflows Schema (corrective / idempotent)
-- This migration is a safe no-op if workflows tables already exist.
-- It resolves "Could not find the table 'public.workflows' in the schema cache"
-- errors that occur on fresh Supabase instances where the prior migration may
-- not have been applied.
-- ============================================================================

-- workflows table (idempotent)
CREATE TABLE IF NOT EXISTS public.workflows (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  trigger_type          text NOT NULL,
  trigger_config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions            jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions               jsonb NOT NULL DEFAULT '[]'::jsonb,
  active                boolean NOT NULL DEFAULT true,
  webhook_url           text,
  target_team_id        uuid,
  target_department_id  uuid,
  assignment_strategy   text DEFAULT 'direct'
    CHECK (assignment_strategy IN ('direct', 'round_robin', 'workload', 'manual')),
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- workflow_executions table (idempotent)
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
  completed_at    timestamptz
);

-- Trigger for updated_at (safe: only creates if not exists)
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

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger ON public.workflows(org_id, trigger_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_wf_exec_org ON public.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_wf ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_started ON public.workflow_executions(org_id, started_at DESC);

-- Grants (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_executions TO authenticated;
GRANT ALL ON public.workflows TO service_role;
GRANT ALL ON public.workflow_executions TO service_role;

-- RLS (safe to call multiple times — ALTER TABLE IF ALREADY ENABLED is a no-op)
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: DROP then recreate to ensure correct definitions
-- (uses IF EXISTS to avoid errors on first run)
DROP POLICY IF EXISTS "members can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "admins can insert workflows" ON public.workflows;
DROP POLICY IF EXISTS "admins can update workflows" ON public.workflows;
DROP POLICY IF EXISTS "admins can delete workflows" ON public.workflows;
DROP POLICY IF EXISTS "members can view workflow_executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "members can insert workflow_executions" ON public.workflow_executions;

CREATE POLICY "members can view workflows"
  ON public.workflows FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "admins can insert workflows"
  ON public.workflows FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can update workflows"
  ON public.workflows FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can delete workflows"
  ON public.workflows FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "members can view workflow_executions"
  ON public.workflow_executions FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert workflow_executions"
  ON public.workflow_executions FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid()));
