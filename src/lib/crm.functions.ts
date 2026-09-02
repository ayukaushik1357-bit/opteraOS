import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";

const orgInput = z.object({ orgId: z.string().uuid() });

// ─────────────────────────────────────────────────────────────────────────────
// Customers — Paginated List (server-side)
// ─────────────────────────────────────────────────────────────────────────────

export const listCustomersPaginated = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(50),
        search: z.string().max(200).optional(),
        status: z.enum(["active", "prospect", "churned", "all"]).default("all"),
        sortBy: z.enum(["created_at", "name", "company"]).default("created_at"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { orgId, page, pageSize, search, status, sortBy, sortDir } = data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = context.supabase
      .from("customers")
      .select("id, name, company, email, phone, status, created_at", { count: "exact" })
      .eq("org_id", orgId);

    if (status !== "all") query = query.eq("status", status);
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},company.ilike.${term},email.ilike.${term}`);
    }

    query = query.order(sortBy, { ascending: sortDir === "asc" }).range(from, to);

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      rows: rows ?? [],
      total: count ?? 0,
      page,
      pageSize,
      pages: Math.ceil((count ?? 0) / pageSize),
    };
  });

// Keep the simple listCustomers for backwards compat (used by deals/invoices pages)
export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customers")
      .select("id, name, company, email, phone, status, created_at")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        company: z.string().trim().max(120).optional().or(z.literal("")),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        status: z.enum(["active", "prospect", "churned"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      org_id: data.orgId,
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      status: data.status,
    };
    if (data.id) {
      const { error } = await context.supabase.from("customers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    // Duplicate check on email within the same org
    if (data.email) {
      const { data: existing } = await context.supabase
        .from("customers")
        .select("id, name")
        .eq("org_id", data.orgId)
        .ilike("email", data.email)
        .maybeSingle();
      if (existing) {
        throw new Error(
          `A customer with email "${data.email}" already exists in this workspace (${existing.name}).`,
        );
      }
    }

    const { data: row, error } = await context.supabase
      .from("customers")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Import Customers
// Processes in batches of 500 server-side. Returns a summary with import,
// skipped, duplicate and error counts. Never trusts org_id from the browser.
// ─────────────────────────────────────────────────────────────────────────────

const bulkCustomerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(["active", "prospect", "churned"]).default("prospect"),
});

export const bulkImportCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        rows: z.array(z.record(z.string(), z.unknown())).min(1).max(50000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { orgId, rows } = data;

    // Fetch existing emails in the org for duplicate detection
    const { data: existingEmailRows } = await context.supabase
      .from("customers")
      .select("email")
      .eq("org_id", orgId)
      .not("email", "is", null);

    const existingEmails = new Set(
      (existingEmailRows ?? []).map((r) => (r.email as string).toLowerCase()),
    );

    // Validate rows
    const valid: Array<{
      org_id: string;
      name: string;
      company: string | null;
      email: string | null;
      phone: string | null;
      status: "active" | "prospect" | "churned";
      created_by: string;
    }> = [];

    let duplicates = 0;
    let errors = 0;
    const errorDetails: { row: number; reason: string }[] = [];
    const seenEmailsThisBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const result = bulkCustomerSchema.safeParse(raw);
      if (!result.success) {
        errors++;
        errorDetails.push({
          row: i + 1,
          reason: result.error.errors.map((e) => e.message).join("; "),
        });
        continue;
      }

      const parsed = result.data;
      const emailKey = parsed.email ? parsed.email.toLowerCase() : null;

      // Duplicate check: existing in DB or seen earlier in this batch
      if (emailKey && (existingEmails.has(emailKey) || seenEmailsThisBatch.has(emailKey))) {
        duplicates++;
        continue;
      }
      if (emailKey) seenEmailsThisBatch.add(emailKey);

      // Normalize status to valid union — zod enforces enum so this is always valid,
      // but we cast explicitly for the Supabase client's strict Insert type
      const validStatus = (["active", "prospect", "churned"].includes(parsed.status)
        ? parsed.status
        : "prospect") as "active" | "prospect" | "churned";

      valid.push({
        org_id: orgId,
        name: parsed.name,
        company: parsed.company || null,
        email: emailKey,
        phone: parsed.phone || null,
        status: validStatus,
        created_by: context.userId,
      });
    }

    // Batch insert in chunks of 500
    const BATCH_SIZE = 500;
    let imported = 0;
    let insertErrors = 0;

    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      const { error: insertErr, data: inserted } = await context.supabase
        .from("customers")
        .insert(batch)
        .select("id");

      if (insertErr) {
        insertErrors += batch.length;
        errorDetails.push({ row: i, reason: `Batch error: ${insertErr.message}` });
      } else {
        imported += (inserted ?? []).length;
      }
    }

    return {
      total: rows.length,
      imported,
      duplicates,
      validationErrors: errors,
      insertErrors,
      errorDetails: errorDetails.slice(0, 50), // cap detail list
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Customer Registration Links
// ─────────────────────────────────────────────────────────────────────────────

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('not found') ||
    code === '42p01' ||
    code === 'pgrst204' ||
    code === 'pgrst205'
  );
}

const memoryRegTokens = new Map<string, any[]>();

export const listCustomerRegTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { data: tokens, error } = await context.supabase
        .from("customer_registration_tokens")
        .select("id, token, label, is_active, expires_at, created_at")
        .eq("org_id", data.orgId)
        .order("created_at", { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return memoryRegTokens.get(data.orgId) || [];
        }
        throw new Error(error.message);
      }
      return tokens ?? [];
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return memoryRegTokens.get(data.orgId) || [];
      }
      throw err;
    }
  });

export const createCustomerRegToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        label: z.string().trim().max(100).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Verify admin
    try {
      const { data: member, error: memberErr } = await context.supabase
        .from("organization_members")
        .select("role")
        .eq("org_id", data.orgId)
        .eq("user_id", context.userId)
        .single();
      if (!memberErr && member && member.role !== "owner" && member.role !== "admin") {
        throw new Error("Only admins and owners can create registration links");
      }
    } catch (e: any) {
      if (e.message?.includes("Only admins")) throw e;
    }

    const generatedToken = crypto.randomUUID();
    const fallbackToken = {
      id: crypto.randomUUID(),
      token: generatedToken,
      label: data.label || null,
      is_active: true,
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data: token, error } = await context.supabase
        .from("customer_registration_tokens")
        .insert({
          org_id: data.orgId,
          created_by: context.userId,
          label: data.label || null,
        })
        .select("id, token, label, is_active, expires_at, created_at")
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          const list = memoryRegTokens.get(data.orgId) || [];
          memoryRegTokens.set(data.orgId, [fallbackToken, ...list]);
          return fallbackToken;
        }
        throw new Error(error.message);
      }
      return token;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        const list = memoryRegTokens.get(data.orgId) || [];
        memoryRegTokens.set(data.orgId, [fallbackToken, ...list]);
        return fallbackToken;
      }
      throw err;
    }
  });

export const revokeCustomerRegToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ tokenId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase
        .from("customer_registration_tokens")
        .update({ is_active: false })
        .eq("id", data.tokenId);
      if (error && !isTableMissingError(error)) throw new Error(error.message);
    } catch (err: any) {
      if (!isTableMissingError(err)) throw err;
    }
    return { ok: true };
  });

// Public server function — no auth required — used by the /register page.
// The org_id is determined server-side from the token; the browser never supplies it.
export const submitCustomerRegistration = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        company: z.string().trim().max(120).optional().or(z.literal("")),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // Use admin client to validate the token without RLS (it's a public endpoint)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate token
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from("customer_registration_tokens")
      .select("id, org_id, is_active, expires_at")
      .eq("token", data.token)
      .single();

    if (tokenErr || !tokenRow) throw new Error("Registration link not found or has been revoked.");
    if (!tokenRow.is_active) throw new Error("This registration link is no longer active.");
    if (new Date(tokenRow.expires_at) < new Date()) throw new Error("This registration link has expired.");

    const orgId = tokenRow.org_id;

    // Check for duplicate email within this org
    if (data.email) {
      const { data: existing } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("org_id", orgId)
        .ilike("email", data.email)
        .maybeSingle();
      if (existing) {
        throw new Error("A record with this email already exists. Please contact the business if you need to update your information.");
      }
    }

    // Insert the customer — org_id comes from the validated token, not the browser
    const { error: insertErr } = await supabaseAdmin.from("customers").insert({
      org_id: orgId,
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      status: "prospect",
    });
    if (insertErr) throw new Error(insertErr.message);

    return { ok: true };
  });

// Public: get org info from a registration token (for the /register page)
export const getCustomerRegTokenInfo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tokenRow, error } = await supabaseAdmin
      .from("customer_registration_tokens")
      .select("id, is_active, expires_at, organizations(name)")
      .eq("token", data.token)
      .single();

    if (error || !tokenRow) return { valid: false as const, reason: "Link not found" };
    if (!tokenRow.is_active) return { valid: false as const, reason: "This link has been deactivated" };
    if (new Date(tokenRow.expires_at) < new Date()) return { valid: false as const, reason: "This link has expired" };

    return {
      valid: true as const,
      orgName: (tokenRow.organizations as { name: string } | null)?.name ?? "this business",
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Deals
// ─────────────────────────────────────────────────────────────────────────────

export const listDeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const [deals, customers] = await Promise.all([
      context.supabase
        .from("deals")
        .select("id, title, value, stage, expected_close, customer_id, created_at")
        .eq("org_id", data.orgId)
        .order("created_at", { ascending: false }),
      context.supabase.from("customers").select("id, name").eq("org_id", data.orgId).order("name"),
    ]);
    if (deals.error) throw new Error(deals.error.message);
    if (customers.error) throw new Error(customers.error.message);
    return { deals: deals.data ?? [], customers: customers.data ?? [] };
  });

export const saveDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        title: z.string().trim().min(2).max(140),
        value: z.number().min(0),
        stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
        customerId: z.string().uuid().optional().or(z.literal("")),
        expectedClose: z.string().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.customerId) {
      const { data: cust, error: custErr } = await context.supabase
        .from("customers")
        .select("id")
        .eq("id", data.customerId)
        .eq("org_id", data.orgId)
        .single();
      if (custErr || !cust) throw new Error("Invalid customer for this organization");
    }
    const payload = {
      org_id: data.orgId,
      title: data.title,
      value: data.value,
      stage: data.stage,
      customer_id: data.customerId || null,
      expected_close: data.expectedClose || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("deals").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("deals")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setDealStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("deals")
      .update({ stage: data.stage })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("deals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const [invoices, customers, orgRes, lineItemsRes] = await Promise.all([
      context.supabase
        .from("invoices")
        .select("id, number, amount, status, issue_date, due_date, paid_at, customer_id")
        .eq("org_id", data.orgId)
        .order("issue_date", { ascending: false }),
      context.supabase
        .from("customers")
        .select("id, name, email, phone, company")
        .eq("org_id", data.orgId)
        .order("name"),
      context.supabase
        .from("organizations")
        .select("name, currency")
        .eq("id", data.orgId)
        .single(),
      (async () => {
        try {
          const res = await (context.supabase as any)
            .from("invoice_line_items")
            .select("id, invoice_id, description, quantity, unit_price, amount")
            .eq("org_id", data.orgId);
          return res.data || [];
        } catch {
          return [];
        }
      })(),
    ]);
    if (invoices.error) throw new Error(invoices.error.message);
    if (customers.error) throw new Error(customers.error.message);

    const lineItemsByInvoice: Record<string, any[]> = {};
    if (Array.isArray(lineItemsRes)) {
      for (const item of lineItemsRes) {
        if (item.invoice_id) {
          if (!lineItemsByInvoice[item.invoice_id]) {
            lineItemsByInvoice[item.invoice_id] = [];
          }
          const list = lineItemsByInvoice[item.invoice_id];
          if (list) list.push(item);
        }
      }
    }

    const enrichedInvoices = (invoices.data ?? []).map((inv: any) => ({
      ...inv,
      line_items: lineItemsByInvoice[inv.id] || [],
    }));

    return {
      invoices: enrichedInvoices,
      customers: customers.data ?? [],
      org: orgRes.data ?? null,
    };
  });

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().min(0.001),
  unit_price: z.number().min(0),
});

export const saveInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        number: z.string().trim().min(1).max(40),
        amount: z.number().min(0),
        status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
        customerId: z.string().uuid().optional().or(z.literal("")),
        issueDate: z.string().min(4),
        dueDate: z.string().optional().or(z.literal("")),
        lineItems: z.array(lineItemSchema).optional(),
        taxRate: z.number().min(0).max(100).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.customerId) {
      const { data: cust, error: custErr } = await context.supabase
        .from("customers")
        .select("id")
        .eq("id", data.customerId)
        .eq("org_id", data.orgId)
        .single();
      if (custErr || !cust) throw new Error("Invalid customer for this organization");
    }

    let computedAmount = data.amount;
    if (data.lineItems && data.lineItems.length > 0) {
      const subtotal = data.lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
      const tax = subtotal * ((data.taxRate ?? 0) / 100);
      computedAmount = subtotal + tax;
    }

    let targetInvoiceId = data.id;

    if (data.id) {
      const updateBase: TablesUpdate<"invoices"> = {
        org_id: data.orgId,
        number: data.number,
        amount: computedAmount,
        status: data.status,
        customer_id: data.customerId || null,
        issue_date: data.issueDate,
        due_date: data.dueDate || null,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
      };
      const { error } = await context.supabase.from("invoices").update(updateBase).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const insertBase: TablesInsert<"invoices"> = {
        org_id: data.orgId,
        number: data.number,
        amount: computedAmount,
        status: data.status,
        customer_id: data.customerId || null,
        issue_date: data.issueDate,
        due_date: data.dueDate || null,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
        created_by: context.userId,
      };
      const { data: row, error } = await context.supabase
        .from("invoices")
        .insert(insertBase)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      targetInvoiceId = row?.id;
    }

    // Persist line items normalized to invoice_line_items
    if (targetInvoiceId && data.lineItems && data.lineItems.length > 0) {
      try {
        await (context.supabase as any)
          .from("invoice_line_items")
          .delete()
          .eq("invoice_id", targetInvoiceId);

        await (context.supabase as any)
          .from("invoice_line_items")
          .insert(
            data.lineItems.map((item) => ({
              org_id: data.orgId,
              invoice_id: targetInvoiceId,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.quantity * item.unit_price,
            }))
          );
      } catch (lineErr) {
        console.warn("[saveInvoice] Line items storage note:", lineErr);
      }
    }

    return { id: targetInvoiceId };
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        invoiceId: z.string().uuid().optional(),
        orgId: z.string().uuid().optional(),
        status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const targetId = data.id || data.invoiceId;
    if (!targetId) throw new Error("Invoice ID is required");
    const { error } = await context.supabase
      .from("invoices")
      .update({
        status: data.status,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", targetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// CRM Summary
// ─────────────────────────────────────────────────────────────────────────────

export const getCrmSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const [customersRes, leadsRes, dealsRes, activitiesRes] = await Promise.all([
      context.supabase
        .from("customers")
        .select("id, status")
        .eq("org_id", data.orgId),
      context.supabase
        .from("leads")
        .select("id, stage")
        .eq("org_id", data.orgId),
      context.supabase
        .from("deals")
        .select("id, stage, value")
        .eq("org_id", data.orgId),
      context.supabase
        .from("activities")
        .select("id, type, title, created_at")
        .eq("org_id", data.orgId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (customersRes.error) throw new Error(customersRes.error.message);
    if (leadsRes.error) throw new Error(leadsRes.error.message);
    if (dealsRes.error) throw new Error(dealsRes.error.message);

    const customers = customersRes.data ?? [];
    const leads = leadsRes.data ?? [];
    const deals = dealsRes.data ?? [];
    const activities = activitiesRes.data ?? [];

    const openLeads = leads.filter((l) => l.stage !== "unqualified").length;
    const openPipeline = deals
      .filter((d) => d.stage !== "won" && d.stage !== "lost")
      .reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const activeThisWeek = activities.filter((a) => {
      const created = new Date(a.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length;

    return {
      customerCount: customers.length,
      openLeads,
      openPipeline,
      activeThisWeek,
      recentActivities: activities,
    };
  });
