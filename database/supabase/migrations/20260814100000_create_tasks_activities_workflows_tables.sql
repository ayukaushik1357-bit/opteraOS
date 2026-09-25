-- Migration for P1 (Tasks, Activities, Notifications) & P3 (Workflows, Workflow Executions)

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_date date,
  status text NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Completed', 'Cancelled')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Activities Table
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

-- 3. Notifications Table
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

-- 4. Workflows Table
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  webhook_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Workflow Executions Table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'successful', 'failed', 'cancelled')),
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Triggers for updated_at
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_customer ON public.activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON public.activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON public.notifications(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_org ON public.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_wf ON public.workflow_executions(workflow_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_executions TO authenticated;

GRANT ALL ON public.tasks TO service_role;
GRANT ALL ON public.activities TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.workflows TO service_role;
GRANT ALL ON public.workflow_executions TO service_role;

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "members can view tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- RLS Policies for activities
CREATE POLICY "members can view activities" ON public.activities FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can delete activities" ON public.activities FOR DELETE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- RLS Policies for notifications
CREATE POLICY "users can view notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "users can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "members can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "users can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for workflows
CREATE POLICY "members can view workflows" ON public.workflows FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "admins can insert workflows" ON public.workflows FOR INSERT TO authenticated WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "admins can update workflows" ON public.workflows FOR UPDATE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "admins can delete workflows" ON public.workflows FOR DELETE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- RLS Policies for workflow_executions
CREATE POLICY "members can view workflow_executions" ON public.workflow_executions FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can insert workflow_executions" ON public.workflow_executions FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
