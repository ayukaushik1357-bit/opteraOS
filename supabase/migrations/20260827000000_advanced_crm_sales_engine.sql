-- ============================================================================
-- opteraOS — Migration: Fragment 3: Advanced CRM + Sales Engine
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

-- 2. CREATE NEW TABLES

-- Pipelines
CREATE TABLE IF NOT EXISTS "pipelines" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "salesTeamId" TEXT REFERENCES "teams"("id") ON DELETE SET NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "pipelines_organizationId_idx" ON "pipelines"("organizationId");
CREATE INDEX IF NOT EXISTS "pipelines_salesTeamId_idx" ON "pipelines"("salesTeamId");

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "pipelineId" TEXT NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "pipeline_stages_organizationId_idx" ON "pipeline_stages"("organizationId");
CREATE INDEX IF NOT EXISTS "pipeline_stages_pipelineId_idx" ON "pipeline_stages"("pipelineId");

-- Lead Sources
CREATE TABLE IF NOT EXISTS "lead_sources" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_sources_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "lead_sources_organizationId_idx" ON "lead_sources"("organizationId");

-- Lead Scoring Rules
CREATE TABLE IF NOT EXISTS "lead_scoring_rules" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "scoreDelta" INTEGER NOT NULL DEFAULT 10,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "lead_scoring_rules_organizationId_idx" ON "lead_scoring_rules"("organizationId");

-- Opportunity Histories
CREATE TABLE IF NOT EXISTS "opportunity_histories" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "opportunityId" TEXT NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "changedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS "opportunity_histories_organizationId_idx" ON "opportunity_histories"("organizationId");
CREATE INDEX IF NOT EXISTS "opportunity_histories_opportunityId_idx" ON "opportunity_histories"("opportunityId");
CREATE INDEX IF NOT EXISTS "opportunity_histories_changedById_idx" ON "opportunity_histories"("changedById");

-- Product Attributes
CREATE TABLE IF NOT EXISTS "product_attributes" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_attributes_organizationId_code_key" UNIQUE ("organizationId", "code")
);
CREATE INDEX IF NOT EXISTS "product_attributes_organizationId_idx" ON "product_attributes"("organizationId");

-- Product Attribute Values
CREATE TABLE IF NOT EXISTS "product_attribute_values" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "attributeId" TEXT NOT NULL REFERENCES "product_attributes"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "colorHex" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "product_attribute_values_attributeId_idx" ON "product_attribute_values"("attributeId");

-- Product Variants
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "product_variants_organizationId_idx" ON "product_variants"("organizationId");
CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON "product_variants"("productId");
CREATE INDEX IF NOT EXISTS "product_variants_sku_idx" ON "product_variants"("sku");

-- Price Lists
CREATE TABLE IF NOT EXISTS "price_lists" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "price_lists_organizationId_idx" ON "price_lists"("organizationId");

-- Price List Items
CREATE TABLE IF NOT EXISTS "price_list_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "priceListId" TEXT NOT NULL REFERENCES "price_lists"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "productVariantId" TEXT REFERENCES "product_variants"("id") ON DELETE SET NULL,
  "categoryId" TEXT REFERENCES "categories"("id") ON DELETE SET NULL,
  "minQuantity" INTEGER NOT NULL DEFAULT 1,
  "pricingType" "PricingType" NOT NULL DEFAULT 'FIXED',
  "fixedPrice" NUMERIC(15,2),
  "discountPercent" NUMERIC(5,2),
  "formula" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "price_list_items_organizationId_idx" ON "price_list_items"("organizationId");
CREATE INDEX IF NOT EXISTS "price_list_items_priceListId_idx" ON "price_list_items"("priceListId");
CREATE INDEX IF NOT EXISTS "price_list_items_productId_idx" ON "price_list_items"("productId");
CREATE INDEX IF NOT EXISTS "price_list_items_productVariantId_idx" ON "price_list_items"("productVariantId");

-- Quotations
CREATE TABLE IF NOT EXISTS "quotations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "quotationNumber" TEXT NOT NULL,
  "opportunityId" TEXT REFERENCES "deals"("id") ON DELETE SET NULL,
  "customerId" TEXT REFERENCES "customers"("id") ON DELETE SET NULL,
  "companyId" TEXT REFERENCES "companies"("id") ON DELETE SET NULL,
  "contactId" TEXT REFERENCES "contacts"("id") ON DELETE SET NULL,
  "salespersonId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "salesTeamId" TEXT REFERENCES "teams"("id") ON DELETE SET NULL,
  "pricelistId" TEXT REFERENCES "price_lists"("id") ON DELETE SET NULL,
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
  "approvedById" TEXT,
  "createdById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotations_organizationId_quotationNumber_key" UNIQUE ("organizationId", "quotationNumber")
);
CREATE INDEX IF NOT EXISTS "quotations_organizationId_idx" ON "quotations"("organizationId");
CREATE INDEX IF NOT EXISTS "quotations_opportunityId_idx" ON "quotations"("opportunityId");
CREATE INDEX IF NOT EXISTS "quotations_customerId_idx" ON "quotations"("customerId");
CREATE INDEX IF NOT EXISTS "quotations_companyId_idx" ON "quotations"("companyId");
CREATE INDEX IF NOT EXISTS "quotations_salespersonId_idx" ON "quotations"("salespersonId");

-- Quotation Items
CREATE TABLE IF NOT EXISTS "quotation_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "quotationId" TEXT NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
  "productVariantId" TEXT REFERENCES "product_variants"("id") ON DELETE SET NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC(15,2) NOT NULL,
  "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "subtotal" NUMERIC(15,2) NOT NULL DEFAULT 0,
  "total" NUMERIC(15,2) NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "quotation_items_organizationId_idx" ON "quotation_items"("organizationId");
CREATE INDEX IF NOT EXISTS "quotation_items_quotationId_idx" ON "quotation_items"("quotationId");
CREATE INDEX IF NOT EXISTS "quotation_items_productId_idx" ON "quotation_items"("productId");

-- Sales Sequences
CREATE TABLE IF NOT EXISTS "sales_sequences" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "sales_sequences_organizationId_idx" ON "sales_sequences"("organizationId");

-- Email Templates
CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS "email_templates_organizationId_idx" ON "email_templates"("organizationId");

-- 3. EXTEND EXISTING TABLES WITH NEW COLUMNS

-- Extend leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "companies"("id") ON DELETE SET NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "contactId" TEXT REFERENCES "contacts"("id") ON DELETE SET NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sourceId" TEXT REFERENCES "lead_sources"("id") ON DELETE SET NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "medium" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "scoringFactors" JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "duplicateScore" JSONB;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "expectedRevenue" NUMERIC(15,2);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "probability" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "salesTeamId" TEXT REFERENCES "teams"("id") ON DELETE SET NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "nextActivityAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "customFields" JSONB;

CREATE INDEX IF NOT EXISTS "leads_companyId_idx" ON "leads"("companyId");
CREATE INDEX IF NOT EXISTS "leads_contactId_idx" ON "leads"("contactId");
CREATE INDEX IF NOT EXISTS "leads_salesTeamId_idx" ON "leads"("salesTeamId");
CREATE INDEX IF NOT EXISTS "leads_phone_idx" ON "leads"("phone");

-- Extend deals
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "companies"("id") ON DELETE SET NULL;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "contactId" TEXT REFERENCES "contacts"("id") ON DELETE SET NULL;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "pipelineId" TEXT REFERENCES "pipelines"("id") ON DELETE SET NULL;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "stageId" TEXT REFERENCES "pipeline_stages"("id") ON DELETE SET NULL;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "salesTeamId" TEXT REFERENCES "teams"("id") ON DELETE SET NULL;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "recurringRevenue" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "weightedRevenue" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "wonAt" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "lostAt" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "lostReason" TEXT;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "customFields" JSONB;

CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId");
CREATE INDEX IF NOT EXISTS "deals_contactId_idx" ON "deals"("contactId");
CREATE INDEX IF NOT EXISTS "deals_pipelineId_idx" ON "deals"("pipelineId");
CREATE INDEX IF NOT EXISTS "deals_stageId_idx" ON "deals"("stageId");
CREATE INDEX IF NOT EXISTS "deals_salesTeamId_idx" ON "deals"("salesTeamId");

-- Extend customers
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "companies"("id") ON DELETE SET NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contactId" TEXT REFERENCES "contacts"("id") ON DELETE SET NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customFields" JSONB;

CREATE INDEX IF NOT EXISTS "customers_companyId_idx" ON "customers"("companyId");
CREATE INDEX IF NOT EXISTS "customers_contactId_idx" ON "customers"("contactId");

-- Extend products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "internalRef" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "uom" TEXT NOT NULL DEFAULT 'Unit';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isSaleable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isPurchasable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isStocked" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hasVariants" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "attributes" JSONB;

-- Extend orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "companies"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "contactId" TEXT REFERENCES "contacts"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "quotationId" TEXT REFERENCES "quotations"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "salespersonId" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "salesTeamId" TEXT REFERENCES "teams"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pricelistId" TEXT REFERENCES "price_lists"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvalRequestedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmedById" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_quotationId_key" ON "orders"("quotationId");
CREATE INDEX IF NOT EXISTS "orders_companyId_idx" ON "orders"("companyId");
CREATE INDEX IF NOT EXISTS "orders_contactId_idx" ON "orders"("contactId");
CREATE INDEX IF NOT EXISTS "orders_salespersonId_idx" ON "orders"("salespersonId");
CREATE INDEX IF NOT EXISTS "orders_salesTeamId_idx" ON "orders"("salesTeamId");

-- Extend order_items
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productVariantId" TEXT REFERENCES "product_variants"("id") ON DELETE SET NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "order_items_productVariantId_idx" ON "order_items"("productVariantId");
