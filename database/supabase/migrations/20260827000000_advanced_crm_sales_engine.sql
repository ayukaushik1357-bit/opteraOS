-- ============================================================================
-- opteraOS â€” Migration: Fragment 3: Advanced CRM + Sales Engine
-- Idempotent PostgreSQL Migration
-- ============================================================================

-- 1. ENUMS (Create if not exists)
DO $$ BEGIN
  CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadAssignmentStrategy" AS ENUM ('MANUAL', 'ROUND_ROBIN', 'LOAD_BASED', 'RULE_BASED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PricingType" AS ENUM ('FIXED', 'PERCENTAGE_DISCOUNT', 'FORMULA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SequenceType" AS ENUM ('QUOTATION', 'SALES_ORDER', 'INVOICE', 'LEAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1b. PREREQUISITE TABLES (not created by earlier migrations — created here idempotently)

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  internal_ref text,
  uom text NOT NULL DEFAULT 'Unit',
  price numeric(15, 2) NOT NULL DEFAULT 0,
  cost numeric(15, 2) NOT NULL DEFAULT 0,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  is_saleable boolean NOT NULL DEFAULT true,
  is_purchasable boolean NOT NULL DEFAULT true,
  is_stocked boolean NOT NULL DEFAULT true,
  has_variants boolean NOT NULL DEFAULT false,
  attributes jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(15, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(15, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(15, 2) NOT NULL DEFAULT 0,
  total numeric(15, 2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(15, 2) NOT NULL,
  tax_rate numeric(5, 2) NOT NULL DEFAULT 0,
  discount_percent numeric(5, 2) NOT NULL DEFAULT 0,
  subtotal numeric(15, 2) NOT NULL DEFAULT 0,
  total numeric(15, 2) NOT NULL,
  sequence integer NOT NULL DEFAULT 0
);

-- 2. CREATE NEW TABLES

-- Pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "salesTeamId" uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "pipelines_organizationId_idx" ON public.pipelines("organizationId");
CREATE INDEX IF NOT EXISTS "pipelines_salesTeamId_idx" ON public.pipelines("salesTeamId");

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "pipelineId" uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "probability" INTEGER NOT NULL DEFAULT 0,
  "requirements" TEXT,
  "isWon" BOOLEAN NOT NULL DEFAULT false,
  "isLost" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT NOT NULL DEFAULT '#6366F1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "pipeline_stages_organizationId_idx" ON public.pipeline_stages("organizationId");
CREATE INDEX IF NOT EXISTS "pipeline_stages_pipelineId_idx" ON public.pipeline_stages("pipelineId");

-- Lead Sources
CREATE TABLE IF NOT EXISTS public.lead_sources (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_sources_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "lead_sources_organizationId_idx" ON public.lead_sources("organizationId");

-- Lead Scoring Rules
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "scoreDelta" INTEGER NOT NULL DEFAULT 10,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "lead_scoring_rules_organizationId_idx" ON public.lead_scoring_rules("organizationId");

-- Opportunity Histories
CREATE TABLE IF NOT EXISTS public.opportunity_histories (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "opportunityId" uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  "changedById" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "fromStage" TEXT,
  "toStage" TEXT,
  "fromValue" NUMERIC(15,2),
  "toValue" NUMERIC(15,2),
  "fromProb" INTEGER,
  "toProb" INTEGER,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "opportunity_histories_organizationId_idx" ON public.opportunity_histories("organizationId");
CREATE INDEX IF NOT EXISTS "opportunity_histories_opportunityId_idx" ON public.opportunity_histories("opportunityId");
CREATE INDEX IF NOT EXISTS "opportunity_histories_changedById_idx" ON public.opportunity_histories("changedById");

-- Product Attributes
CREATE TABLE IF NOT EXISTS public.product_attributes (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_attributes_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "product_attributes_organizationId_idx" ON public.product_attributes("organizationId");

-- Product Attribute Values
CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "attributeId" uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "colorHex" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "product_attribute_values_attributeId_idx" ON public.product_attribute_values("attributeId");

-- Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "productId" uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "sku" TEXT,
  "barcode" TEXT,
  "name" TEXT NOT NULL,
  "priceAdjustment" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "costAdjustment" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "attributeValues" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "product_variants_organizationId_idx" ON public.product_variants("organizationId");
CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON public.product_variants("productId");
CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON public.product_variants("sku");

-- Price Lists
CREATE TABLE IF NOT EXISTS public.price_lists (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "price_lists_organizationId_idx" ON public.price_lists("organizationId");

-- Price List Items
CREATE TABLE IF NOT EXISTS public.price_list_items (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "priceListId" uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  "productId" uuid REFERENCES public.products(id) ON DELETE SET NULL,
  "productVariantId" uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  "categoryId" uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  "minQuantity" INTEGER NOT NULL DEFAULT 1,
  "pricingType" "PricingType" NOT NULL DEFAULT 'FIXED',
  "fixedPrice" NUMERIC(15,2),
  "discountPercent" NUMERIC(5,2),
  "formula" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "price_list_items_organizationId_idx" ON public.price_list_items("organizationId");
CREATE INDEX IF NOT EXISTS "price_list_items_priceListId_idx" ON public.price_list_items("priceListId");
CREATE INDEX IF NOT EXISTS "price_list_items_productId_idx" ON public.price_list_items("productId");
CREATE INDEX IF NOT EXISTS "price_list_items_productVariantId_idx" ON public.price_list_items("productVariantId");

-- Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "quotationNumber" TEXT NOT NULL,
  "opportunityId" uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  "customerId" uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  "companyId" uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  "contactId" uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  "salespersonId" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "salesTeamId" uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  "priceListId" uuid REFERENCES public.price_lists(id) ON DELETE SET NULL,
  "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expirationDate" TIMESTAMP(3),
  "paymentTerms" TEXT,
  "subtotal" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "taxAmount" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "discountAmount" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "total" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "terms" TEXT,
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "acceptedBy" TEXT,
  "acceptedIp" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "pdfStorageKey" TEXT,
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NONE',
  "approvedById" uuid,
  "createdById" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotations_organizationId_quotationNumber_key" UNIQUE ("organizationId", "quotationNumber")
);
CREATE INDEX IF NOT EXISTS "quotations_organizationId_idx" ON public.quotations("organizationId");
CREATE INDEX IF NOT EXISTS "quotations_opportunityId_idx" ON public.quotations("opportunityId");
CREATE INDEX IF NOT EXISTS "quotations_customerId_idx" ON public.quotations("customerId");
CREATE INDEX IF NOT EXISTS "quotations_companyId_idx" ON public.quotations("companyId");
CREATE INDEX IF NOT EXISTS "quotations_salespersonId_idx" ON public.quotations("salespersonId");

-- Quotation Items
CREATE TABLE IF NOT EXISTS public.quotation_items (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "quotationId" uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  "productId" uuid REFERENCES public.products(id) ON DELETE SET NULL,
  "productVariantId" uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(15,2) NOT NULL,
  "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "subtotal" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "total" NUMERIC(15,2) NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "quotation_items_organizationId_idx" ON public.quotation_items("organizationId");
CREATE INDEX IF NOT EXISTS "quotation_items_quotationId_idx" ON public.quotation_items("quotationId");
CREATE INDEX IF NOT EXISTS "quotation_items_productId_idx" ON public.quotation_items("productId");

-- Sales Sequences
CREATE TABLE IF NOT EXISTS public.sales_sequences (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "sequenceType" "SequenceType" NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT 'SO',
  "suffix" TEXT,
  "padding" INTEGER NOT NULL DEFAULT 5,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "yearReset" BOOLEAN NOT NULL DEFAULT true,
  "currentYear" INTEGER NOT NULL DEFAULT 2026,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_sequences_organizationId_sequenceType_key" UNIQUE ("organizationId", "sequenceType")
);
CREATE INDEX IF NOT EXISTS "sales_sequences_organizationId_idx" ON public.sales_sequences("organizationId");

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT 'QUOTATION',
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "bodyText" TEXT,
  "variables" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_templates_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "email_templates_organizationId_idx" ON public.email_templates("organizationId");

-- 3. EXTEND EXISTING TABLES WITH NEW COLUMNS

-- Extend leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "companyId" uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "contactId" uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "sourceId" uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "medium" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "scoringFactors" JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "duplicateScore" JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "expectedRevenue" NUMERIC(15,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "probability" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "salesTeamId" uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "nextActivityAt" TIMESTAMP(3);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "customFields" JSONB;

CREATE INDEX IF NOT EXISTS "leads_companyId_idx" ON public.leads("companyId");
CREATE INDEX IF NOT EXISTS "leads_contactId_idx" ON public.leads("contactId");
CREATE INDEX IF NOT EXISTS "leads_salesTeamId_idx" ON public.leads("salesTeamId");
CREATE INDEX IF NOT EXISTS "leads_phone_idx" ON public.leads("phone");

-- Extend deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "companyId" uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "contactId" uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "pipelineId" uuid REFERENCES public.pipelines(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "stageId" uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "salesTeamId" uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "recurringRevenue" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "weightedRevenue" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "wonAt" TIMESTAMP(3);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "lostAt" TIMESTAMP(3);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS "customFields" JSONB;

CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON public.deals("companyId");
CREATE INDEX IF NOT EXISTS "deals_contactId_idx" ON public.deals("contactId");
CREATE INDEX IF NOT EXISTS "deals_pipelineId_idx" ON public.deals("pipelineId");
CREATE INDEX IF NOT EXISTS "deals_stageId_idx" ON public.deals("stageId");
CREATE INDEX IF NOT EXISTS "deals_salesTeamId_idx" ON public.deals("salesTeamId");

-- Extend customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "companyId" uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "contactId" uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "customFields" JSONB;

CREATE INDEX IF NOT EXISTS "customers_companyId_idx" ON public.customers("companyId");
CREATE INDEX IF NOT EXISTS "customers_contactId_idx" ON public.customers("contactId");

-- Extend products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "internalRef" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "uom" TEXT NOT NULL DEFAULT 'Unit';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "isSaleable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "isPurchasable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "isStocked" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "hasVariants" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "attributes" JSONB;

-- Extend orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "companyId" uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "contactId" uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "quotationId" uuid REFERENCES public.quotations(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "salespersonId" uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "salesTeamId" uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "priceListId" uuid REFERENCES public.price_lists(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "approvalRequestedAt" TIMESTAMP(3);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "approvedById" uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "confirmedById" uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_quotationId_key" ON public.orders("quotationId");
CREATE INDEX IF NOT EXISTS "orders_companyId_idx" ON public.orders("companyId");
CREATE INDEX IF NOT EXISTS "orders_contactId_idx" ON public.orders("contactId");
CREATE INDEX IF NOT EXISTS "orders_salespersonId_idx" ON public.orders("salespersonId");
CREATE INDEX IF NOT EXISTS "orders_salesTeamId_idx" ON public.orders("salesTeamId");

-- Extend order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS "productVariantId" uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "order_items_productVariantId_idx" ON public.order_items("productVariantId");






