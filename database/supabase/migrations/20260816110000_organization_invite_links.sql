-- ============================================================================
-- Migration: Organization Invite Links (Link-based Member Invitations)
-- Allows org admins to share a single link that multiple people can use
-- to join the workspace. Unlike email invites (organization_invites with
-- UNIQUE(org_id,email)), these are anonymous token-based links.
-- Security: org_id and role are stored in this table; the browser never
--           supplies them — only the opaque token UUID.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_invite_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  role        public.org_role NOT NULL DEFAULT 'member',
  invited_by  uuid NOT NULL,
  max_uses    integer,                            -- NULL = unlimited
  used_count  integer NOT NULL DEFAULT 0,
  status      public.invite_status NOT NULL DEFAULT 'pending',
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oil_org ON public.organization_invite_links(org_id);
CREATE INDEX IF NOT EXISTS idx_oil_token ON public.organization_invite_links(token);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invite_links TO authenticated;
GRANT ALL ON public.organization_invite_links TO service_role;

-- RLS
ALTER TABLE public.organization_invite_links ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage invite links for their org
CREATE POLICY "admins can view invite links"
  ON public.organization_invite_links FOR SELECT TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can create invite links"
  ON public.organization_invite_links FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
  );

CREATE POLICY "admins can update invite links"
  ON public.organization_invite_links FOR UPDATE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can delete invite links"
  ON public.organization_invite_links FOR DELETE TO authenticated
  USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- Note: acceptInviteByToken server function validates/uses the token server-side
-- using the user's auth context + service-role for the increment. No anon policy needed.
