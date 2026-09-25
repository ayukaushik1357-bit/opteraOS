-- Migration: Add line_items and invoice_number to invoices table
-- Additive, non-breaking change — existing rows will have line_items = NULL

-- 1. Add line_items column for JSON line item array
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS line_items jsonb;

-- 2. Add invoice_number as alias (invoices currently use 'number'; add invoice_number for clarity)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_number text GENERATED ALWAYS AS (number) STORED;

-- 3. Add tax_rate column (percentage, default 0 = no tax)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0;

-- Index for invoice_number lookups
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(org_id, number);

COMMENT ON COLUMN public.invoices.line_items IS
  'JSON array of line items: [{description, quantity, unit_price}]';
COMMENT ON COLUMN public.invoices.tax_rate IS
  'Tax percentage (0-100). 18 = 18% GST. 0 = no tax.';
