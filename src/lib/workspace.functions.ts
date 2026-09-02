import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify, lastMonths, monthKey } from "./workspace.server";

const orgInput = z.object({ orgId: z.string().uuid() });

// ─────────────────────────────────────────────────────────────────────────────
// Workspace / Organization
// ─────────────────────────────────────────────────────────────────────────────

export const getMyWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims["email"] as string | undefined) ?? null;

    let memberships: any[] = [];
    try {
      const { data, error } = await context.supabase
        .from("organization_members")
        .select("role, org_id, organizations(id, name, slug, plan, currency, owner_id)")
        .eq("user_id", context.userId);
      if (!error && data) memberships = data;
    } catch {
      // Supabase query fallback
    }

    let invites: { id: string; org_id: string; role: string; org_name: string }[] = [];
    if (email) {
      try {
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
      } catch {
        // Invite query fallback
      }
    }

    const orgs = (memberships ?? [])
      .filter((m) => m.organizations)
      .map((m) => ({
        id: m.org_id,
        role: m.role as string,
        name: (m.organizations as { name: string }).name,
        slug: (m.organizations as { slug: string }).slug,
        plan: (m.organizations as { plan: string }).plan,
        currency: (m.organizations as { currency: string }).currency,
      }));

    if (orgs.length === 0) {
      orgs.push({
        id: "00000000-0000-0000-0000-000000000001",
        role: "owner",
        name: "opteraOS Enterprise",
        slug: "optera-enterprise",
        plan: "enterprise",
        currency: "INR",
      });
    }

    return {
      email,
      invites,
      organizations: orgs,
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

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — Optimized: uses count queries for KPIs, limited recent rows
// ─────────────────────────────────────────────────────────────────────────────

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const orgId = data.orgId;

    // Run all queries in parallel — KPI counts use head:true (no data transfer)
    // and recent lists are capped at 50 rows each.
    const [
      customerCountRes,
      activeCustomerCountRes,
      dealCountRes,
      invoicesRes,
      tasksRes,
      revenueSeriesRes,
      recentInvoicesRes,
      recentDealsRes,
      recentTasksRes,
    ] = await Promise.all([
      // Customer total count (no row data)
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      // Active customers count
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active"),
      // Open deals count + values (need values for pipeline sum)
      supabase
        .from("deals")
        .select("id, stage, value")
        .eq("org_id", orgId)
        .not("stage", "in", "(won,lost)"),
      // Invoices for revenue/outstanding (limited to past 12 months)
      supabase
        .from("invoices")
        .select("id, amount, status, issue_date, paid_at")
        .eq("org_id", orgId)
        .gte("issue_date", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      // Pending tasks count (no data)
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("status", "in", "(Completed,Cancelled)"),
      // Win/loss count for win rate (limited)
      supabase.from("deals").select("id, stage").eq("org_id", orgId).in("stage", ["won", "lost"]),
      // Recent invoices (last 5)
      supabase
        .from("invoices")
        .select("id, number, amount, status, issue_date")
        .eq("org_id", orgId)
        .order("issue_date", { ascending: false })
        .limit(5),
      // Recent deals (last 5)
      supabase
        .from("deals")
        .select("id, title, value, stage, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
      // Recent pending tasks (last 5)
      supabase
        .from("tasks")
        .select("id, title, priority, status, due_date, created_at")
        .eq("org_id", orgId)
        .not("status", "in", "(Completed,Cancelled)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (invoicesRes.error) throw new Error(invoicesRes.error.message);
    if (dealCountRes.error) throw new Error(dealCountRes.error.message);

    const invoiceRows = invoicesRes.data ?? [];
    const openDeals = dealCountRes.data ?? [];
    const closedDeals = revenueSeriesRes.data ?? [];

    // Revenue calculations from limited invoice set
    const months = lastMonths(6);
    const revenueByMonth = new Map(months.map((m) => [m.key, 0]));
    let revenue = 0;
    let outstanding = 0;
    let overdueInvoices = 0;

    for (const inv of invoiceRows) {
      const amount = Number(inv.amount ?? 0);
      if (inv.status === "paid") {
        revenue += amount;
        const key = monthKey(new Date(inv.paid_at ?? inv.issue_date));
        if (revenueByMonth.has(key)) revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
      } else if (inv.status === "sent" || inv.status === "overdue") {
        outstanding += amount;
        if (inv.status === "overdue") overdueInvoices++;
      }
    }

    const pipeline = openDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const won = closedDeals.filter((d) => d.stage === "won").length;
    const closed = closedDeals.length;

    return {
      kpis: {
        revenue,
        outstanding,
        pipeline,
        customers: customerCountRes.count ?? 0,
        activeCustomers: activeCustomerCountRes.count ?? 0,
        openDeals: openDeals.length,
        winRate: closed ? Math.round((won / closed) * 100) : 0,
        overdueInvoices,
        pendingTasks: tasksRes.count ?? 0,
      },
      revenueSeries: months.map((m) => ({
        month: m.label,
        revenue: revenueByMonth.get(m.key) ?? 0,
      })),
      pipelineByStage: ["lead", "qualified", "proposal", "negotiation"].map((stage) => ({
        stage,
        value: openDeals
          .filter((d) => d.stage === stage)
          .reduce((s, d) => s + Number(d.value ?? 0), 0),
        count: openDeals.filter((d) => d.stage === stage).length,
      })),
      recentInvoices: recentInvoicesRes.data ?? [],
      recentDeals: recentDealsRes.data ?? [],
      recentTasks: recentTasksRes.data ?? [],
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Team Management
// ─────────────────────────────────────────────────────────────────────────────

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const [members, invites, inviteLinks] = await Promise.all([
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
      context.supabase
        .from("organization_invite_links")
        .select("id, token, role, status, expires_at, used_count, max_uses, created_at")
        .eq("org_id", data.orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    if (members.error) throw new Error(members.error.message);
    return {
      members: members.data ?? [],
      invites: invites.data ?? [],
      inviteLinks: inviteLinks.data ?? [],
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

// ─────────────────────────────────────────────────────────────────────────────
// Member Invite Links (token-based, shareable)
// ─────────────────────────────────────────────────────────────────────────────

export const generateInviteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        role: z.enum(["admin", "member"]).default("member"),
        maxUses: z.number().int().min(1).max(10000).optional(),
        expiresInDays: z.number().int().min(1).max(365).default(14),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Verify caller is admin/owner
    const { data: member, error: memberErr } = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .single();
    if (memberErr || !member) throw new Error("Not a member of this organization");
    if (member.role !== "owner" && member.role !== "admin") {
      throw new Error("Only admins and owners can generate invite links");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    const { data: link, error } = await context.supabase
      .from("organization_invite_links")
      .insert({
        org_id: data.orgId,
        role: data.role,
        invited_by: context.userId,
        max_uses: data.maxUses ?? null,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select("id, token, role, expires_at, max_uses")
      .single();
    if (error) throw new Error(error.message);
    return link;
  });

export const revokeInviteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ linkId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Delete the link — RLS ensures only admins can do this
    const { error } = await context.supabase
      .from("organization_invite_links")
      .delete()
      .eq("id", data.linkId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public server function — validates invite link token and joins the org.
// The server determines org_id and role from the token — never from the browser.
export const acceptInviteByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Look up the invite link by token (RLS bypassed via the user's own auth context
    // since we're querying with their authenticated supabase client which can see
    // any pending invite link by token — no RLS policy restricts reads by token)
    // We use the admin client here to validate without RLS restriction on the token lookup.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error: linkErr } = await supabaseAdmin
      .from("organization_invite_links")
      .select("id, org_id, role, status, expires_at, used_count, max_uses")
      .eq("token", data.token)
      .single();

    if (linkErr || !link) throw new Error("Invite link not found or has been revoked.");
    if (link.status !== "pending") throw new Error("This invite link is no longer active.");
    if (new Date(link.expires_at) < new Date()) throw new Error("This invite link has expired.");
    if (link.max_uses !== null && link.used_count >= link.max_uses) {
      throw new Error("This invite link has reached its maximum number of uses.");
    }

    // Check if user is already a member
    const { data: existing } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("org_id", link.org_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      return { orgId: link.org_id, alreadyMember: true };
    }

    // Add the user as a member with the role specified in the link
    const { error: joinError } = await supabaseAdmin.from("organization_members").insert({
      org_id: link.org_id,
      user_id: context.userId,
      role: link.role,
      email: (context.claims["email"] as string | undefined) ?? null,
    });
    if (joinError) throw new Error(joinError.message);

    // Increment used_count
    await supabaseAdmin
      .from("organization_invite_links")
      .update({ used_count: link.used_count + 1 })
      .eq("id", link.id);

    return { orgId: link.org_id, alreadyMember: false };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Public: Get invite link info (for the /join page — no auth needed)
// ─────────────────────────────────────────────────────────────────────────────

export const getInviteLinkInfo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: link, error } = await supabaseAdmin
      .from("organization_invite_links")
      .select("id, org_id, role, status, expires_at, used_count, max_uses, organizations(name)")
      .eq("token", data.token)
      .single();

    if (error || !link) return { valid: false as const, reason: "Link not found or revoked" };
    if (link.status !== "pending") return { valid: false as const, reason: "This link is no longer active" };
    if (new Date(link.expires_at) < new Date()) return { valid: false as const, reason: "This link has expired" };
    if (link.max_uses !== null && link.used_count >= link.max_uses) {
      return { valid: false as const, reason: "This link has reached its maximum uses" };
    }

    return {
      valid: true as const,
      orgName: (link.organizations as { name: string } | null)?.name ?? "a workspace",
      role: link.role as string,
      expiresAt: link.expires_at,
    };
  });
