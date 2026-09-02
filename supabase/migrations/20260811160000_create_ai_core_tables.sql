-- 1. AI Conversations Table
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. AI Messages Table
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. AI Insights Table
CREATE TABLE public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  action_recommended text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. AI Action Logs Table
CREATE TABLE public.ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers
CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_ai_conv_org ON public.ai_conversations(org_id);
CREATE INDEX idx_ai_conv_user ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_msg_conv ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_msg_org ON public.ai_messages(org_id);
CREATE INDEX idx_ai_insights_org ON public.ai_insights(org_id);
CREATE INDEX idx_ai_action_logs_org ON public.ai_action_logs(org_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_action_logs TO authenticated;

GRANT ALL ON public.ai_conversations TO service_role;
GRANT ALL ON public.ai_messages TO service_role;
GRANT ALL ON public.ai_insights TO service_role;
GRANT ALL ON public.ai_action_logs TO service_role;

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

-- Policies for ai_conversations
CREATE POLICY "members can view ai_conversations" ON public.ai_conversations FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert ai_conversations" ON public.ai_conversations FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(org_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "members can update ai_conversations" ON public.ai_conversations FOR UPDATE TO authenticated
USING (public.is_org_member(org_id, auth.uid()))
WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can delete ai_conversations" ON public.ai_conversations FOR DELETE TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

-- Policies for ai_messages
CREATE POLICY "members can view ai_messages" ON public.ai_messages FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert ai_messages" ON public.ai_messages FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can delete ai_messages" ON public.ai_messages FOR DELETE TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

-- Policies for ai_insights
CREATE POLICY "members can view ai_insights" ON public.ai_insights FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

-- Policies for ai_action_logs
CREATE POLICY "members can view ai_action_logs" ON public.ai_action_logs FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));
