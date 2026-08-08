-- Roles
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TYPE public.customer_status AS ENUM ('active', 'prospect', 'churned');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'trial',
  currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  full_name text,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

-- Helper functions (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org_id uuid, _user_id uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.org_id = _org_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;

-- Auto-add owner membership when an org is created
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (org_id, user_id, role, email)
  VALUES (NEW.id, NEW.owner_id, 'owner', (SELECT email FROM auth.users WHERE id = NEW.owner_id))
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_organization_created
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Business data
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  status public.customer_status NOT NULL DEFAULT 'prospect',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  value numeric(14,2) NOT NULL DEFAULT 0,
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  expected_close date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  number text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, number)
);

CREATE INDEX idx_customers_org ON public.customers(org_id);
CREATE INDEX idx_deals_org ON public.deals(org_id);
CREATE INDEX idx_invoices_org ON public.invoices(org_id);
CREATE INDEX idx_members_user ON public.organization_members(user_id);

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.organizations, public.organization_members, public.organization_invites, public.customers, public.deals, public.invoices TO service_role;

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view org" ON public.organizations FOR SELECT TO authenticated
USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "users can create org" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admins can update org" ON public.organizations FOR UPDATE TO authenticated
USING (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
WITH CHECK (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "owner can delete org" ON public.organizations FOR DELETE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "members can view members" ON public.organization_members FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "self can join via accepted invite" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins can update members" ON public.organization_members FOR UPDATE TO authenticated
USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "admins or self can remove members" ON public.organization_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "admins can view invites" ON public.organization_invites FOR SELECT TO authenticated
USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
       OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
CREATE POLICY "admins can create invites" ON public.organization_invites FOR INSERT TO authenticated
WITH CHECK (invited_by = auth.uid() AND public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "admins or invitee can update invites" ON public.organization_invites FOR UPDATE TO authenticated
USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
       OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
WITH CHECK (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[])
       OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
CREATE POLICY "admins can delete invites" ON public.organization_invites FOR DELETE TO authenticated
USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "members can view customers" ON public.customers FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can update customers" ON public.customers FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "admins can delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "members can view deals" ON public.deals FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can insert deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can update deals" ON public.deals FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "admins can delete deals" ON public.deals FOR DELETE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE POLICY "members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.is_org_member(org_id, auth.uid())) WITH CHECK (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));