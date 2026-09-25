-- ============================================================================
-- Migration: Customer Registration Tokens
-- Allows org admins to generate a public link customers can use to submit
-- their own contact details. The link does NOT grant auth/dashboard access.
-- Security: org_id is stored server-side in the token row; the browser
--           only supplies the opaque UUID token.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_registration_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token      uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  label      text,                                -- optional human-readable note
  created_by uuid NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crt_org ON public.customer_registration_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_crt_token ON public.customer_registration_tokens(token);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_registration_tokens TO authenticated;
GRANT ALL ON public.customer_registration_tokens TO service_role;

-- RLS
ALTER TABLE public.customer_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Admins/owners can manage tokens for their org
CREATE POLICY "admins can view reg tokens"
  ON public.customer_registration_tokens FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can create reg tokens"
  ON public.customer_registration_tokens FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
  );

CREATE POLICY "admins can update reg tokens"
  ON public.customer_registration_tokens FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can delete reg tokens"
  ON public.customer_registration_tokens FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- Note: The public submitCustomerRegistration server function validates the token
-- using the service-role client on the server side. No anon policy is needed here
-- because that route bypasses RLS via the service-role key server-side.
