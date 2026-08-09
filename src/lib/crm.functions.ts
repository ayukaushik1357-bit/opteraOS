import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { error } = await context.supabase.from("deals").update({ stage: data.stage }).eq("id", data.id);
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
    const [invoices, customers] = await Promise.all([
      context.supabase
        .from("invoices")
        .select("id, number, amount, status, issue_date, due_date, paid_at, customer_id")
        .eq("org_id", data.orgId)
        .order("issue_date", { ascending: false }),
      context.supabase.from("customers").select("id, name").eq("org_id", data.orgId).order("name"),
    ]);
    if (invoices.error) throw new Error(invoices.error.message);
    if (customers.error) throw new Error(customers.error.message);
    return { invoices: invoices.data ?? [], customers: customers.data ?? [] };
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
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      org_id: data.orgId,
      number: data.number,
      amount: data.amount,
      status: data.status,
      customer_id: data.customerId || null,
      issue_date: data.issueDate,
      due_date: data.dueDate || null,
      paid_at: data.status === "paid" ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("invoices").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("invoices")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["draft", "sent", "paid", "overdue", "void"]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoices")
      .update({ status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null })
      .eq("id", data.id);
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