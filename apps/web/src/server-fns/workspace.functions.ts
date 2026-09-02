import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify, lastMonths, monthKey } from "@optera/server/workspace";

export const getMyWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims["email"] as string | undefined) ?? null;

    const { data: memberships, error } = await context.supabase
      .from("organization_members")
      .select("role, org_id, organizations(id, name, slug, plan, currency, owner_id)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    let invites: { id: string; org_id: string; role: string; org_name: string }[] = [];
    if (email) {
      const { data: inviteRows } = await context.supabase
        .from("organization_invites")
        .select("id, org_id, role, organizations(name)")
        .eq("status", "pending")
        .ilike("email", email);
      invites = (inviteRows ?? []).map((r) => ({
        id: r.id,
        org_id: r.org_id,
        role: r.role as string,
        org_name: (r.organizations as { name: string } | null)?.name ?? "Workspace",
      }));
    }

    return {
      email,
      invites,
      organizations: (memberships ?? [])
        .filter((m) => m.organizations)
        .map((m) => ({
          id: m.org_id,
          role: m.role as string,
          name: (m.organizations as { name: string }).name,
          slug: (m.organizations as { slug: string }).slug,
          plan: (m.organizations as { plan: string }).plan,
          currency: (m.organizations as { currency: string }).currency,
        })),
    };
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ name: z.string().trim().min(2).max(60), currency: z.string().trim().min(3).max(3) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: org, error } = await context.supabase
      .from("organizations")
      .insert({
        name: data.name,
        slug: slugify(data.name),
        owner_id: context.userId,
        currency: data.currency.toUpperCase(),
      })
      .select("id, name, slug")
      .single();
    if (error) throw new Error(error.message);
    return org;
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ inviteId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: invite, error } = await context.supabase
      .from("organization_invites")
      .select("id, org_id, role, status, expires_at")
      .eq("id", data.inviteId)
      .single();
    if (error || !invite) throw new Error("Invitation not found");
    if (invite.status !== "pending") throw new Error("Invitation is no longer valid");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Invitation has expired");

    const { error: joinError } = await context.supabase.from("organization_members").insert({
      org_id: invite.org_id,
      user_id: context.userId,
      role: invite.role,
      email: (context.claims["email"] as string | undefined) ?? null,
    });
    if (joinError) throw new Error(joinError.message);

    await context.supabase
      .from("organization_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);
    return { orgId: invite.org_id };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const [customers, deals, invoices, tasks] = await Promise.all([
      context.supabase
        .from("customers")
        .select("id, name, company, status, created_at")
        .eq("org_id", data.orgId),
      context.supabase
        .from("deals")
        .select("id, title, value, stage, expected_close, created_at")
        .eq("org_id", data.orgId),
      context.supabase
        .from("invoices")
        .select("id, number, amount, status, issue_date, due_date, paid_at")
        .eq("org_id", data.orgId),
      context.supabase
        .from("tasks")
        .select("id, title, priority, status, due_date, created_at")
        .eq("org_id", data.orgId),
    ]);
    if (customers.error) throw new Error(customers.error.message);
    if (deals.error) throw new Error(deals.error.message);
    if (invoices.error) throw new Error(invoices.error.message);

    const invoiceRows = invoices.data ?? [];
    const dealRows = deals.data ?? [];
    const customerRows = customers.data ?? [];
    const taskRows = tasks.data ?? [];

    const months = lastMonths(6);
    const revenueByMonth = new Map(months.map((m) => [m.key, 0]));
    let revenue = 0;
    let outstanding = 0;
    for (const inv of invoiceRows) {
      const amount = Number(inv.amount ?? 0);
      if (inv.status === "paid") {
        revenue += amount;
        const key = monthKey(new Date(inv.paid_at ?? inv.issue_date));
        if (revenueByMonth.has(key))
          revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
      } else if (inv.status === "sent" || inv.status === "overdue") {
        outstanding += amount;
      }
    }

    const openDeals = dealRows.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const pipeline = openDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const won = dealRows.filter((d) => d.stage === "won").length;
    const closed = dealRows.filter((d) => d.stage === "won" || d.stage === "lost").length;
    const pendingTasks = taskRows.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");

    return {
      kpis: {
        revenue,
        outstanding,
        pipeline,
        customers: customerRows.length,
        activeCustomers: customerRows.filter((c) => c.status === "active").length,
        openDeals: openDeals.length,
        winRate: closed ? Math.round((won / closed) * 100) : 0,
        overdueInvoices: invoiceRows.filter((i) => i.status === "overdue").length,
        pendingTasks: pendingTasks.length,
      },
      revenueSeries: months.map((m) => ({
        month: m.label,
        revenue: revenueByMonth.get(m.key) ?? 0,
      })),
      pipelineByStage: ["lead", "qualified", "proposal", "negotiation"].map((stage) => ({
        stage,
        value: dealRows
          .filter((d) => d.stage === stage)
          .reduce((s, d) => s + Number(d.value ?? 0), 0),
        count: dealRows.filter((d) => d.stage === stage).length,
      })),
      recentInvoices: invoiceRows
        .slice()
        .sort((a, b) => (a.issue_date < b.issue_date ? 1 : -1))
        .slice(0, 5),
      recentDeals: dealRows
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
      recentTasks: pendingTasks
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
    };
  });

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const [members, invites] = await Promise.all([
      context.supabase
        .from("organization_members")
        .select("id, user_id, email, full_name, role, created_at")
        .eq("org_id", data.orgId)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("organization_invites")
        .select("id, email, role, status, expires_at, created_at")
        .eq("org_id", data.orgId)
        .eq("status", "pending"),
    ]);
    if (members.error) throw new Error(members.error.message);
    return {
      members: members.data ?? [],
      invites: invites.data ?? [],
      myUserId: context.userId,
    };
  });

export const inviteTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        email: z.string().trim().email().max(160),
        role: z.enum(["admin", "member"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("organization_invites").upsert(
      {
        org_id: data.orgId,
        email: data.email.toLowerCase(),
        role: data.role,
        invited_by: context.userId,
        status: "pending",
      },
      { onConflict: "org_id,email" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ inviteId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("organization_invites")
      .delete()
      .eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ memberId: z.string().uuid(), role: z.enum(["admin", "member"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("organization_members")
      .update({ role: data.role })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ memberId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("organization_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
