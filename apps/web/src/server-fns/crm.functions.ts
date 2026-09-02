import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";

const orgInput = z.object({ orgId: z.string().uuid() });

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customers")
      .select("id, name, company, email, phone, status, created_at")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: false });
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

    // Compute amount from line items if provided
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

/**
 * getCrmSummary — aggregates real CRM stats for the CRM hub page.
 * Returns customer count, open lead count, open pipeline value, and
 * recent activities. All data is strictly filtered by org_id.
 */
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
