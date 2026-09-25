-- Lead Stage Enum
CREATE TYPE public.lead_stage AS ENUM ('new', 'contacted', 'qualified', 'unqualified');

-- Leads Table
CREATE TABLE public.leads (
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

-- Updated_at Trigger
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for Leads and Foreign Keys
CREATE INDEX idx_leads_org ON public.leads(org_id);
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_deals_customer ON public.deals(customer_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view leads" ON public.leads FOR SELECT TO authenticated
USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can insert leads" ON public.leads FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "members can update leads" ON public.leads FOR UPDATE TO authenticated
USING (public.is_org_member(org_id, auth.uid()))
WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "admins can delete leads" ON public.leads FOR DELETE TO authenticated
USING (public.has_org_role(org_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
