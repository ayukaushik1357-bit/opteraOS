/**
 * analytics.functions.ts
 *
 * Dedicated Server-Side Analytics & Reporting Engine for opteraOS.
 *
 * Security & Isolation Guarantees:
 *  1. Requires authenticated Supabase session (requireSupabaseAuth).
 *  2. Verifies user is an active member of the requested org_id before returning data.
 *  3. Never trusts client-supplied org_id without membership verification.
 *  4. All database queries are explicitly filtered with `.eq("org_id", verifiedOrgId)`.
 *  5. Returns strictly typed data structures.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DateRangePreset = "7d" | "30d" | "90d" | "6m" | "12m" | "ytd" | "all" | "custom";

export interface DateWindow {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}

export function computeDateWindows(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): DateWindow {
  const now = new Date();
  const currentEnd = customEnd ? new Date(customEnd) : new Date(now);
  let currentStart = new Date(now);

  switch (preset) {
    case "7d":
      currentStart.setDate(now.getDate() - 7);
      break;
    case "30d":
      currentStart.setDate(now.getDate() - 30);
      break;
    case "90d":
      currentStart.setDate(now.getDate() - 90);
      break;
    case "6m":
      currentStart.setMonth(now.getMonth() - 6);
      break;
    case "12m":
      currentStart.setFullYear(now.getFullYear() - 1);
      break;
    case "ytd":
      currentStart = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom":
      if (customStart) currentStart = new Date(customStart);
      else currentStart.setDate(now.getDate() - 30);
      break;
    case "all":
      currentStart = new Date(2020, 0, 1);
      break;
  }

  // Compute equivalent duration previous window for comparison
  const durationMs = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification Helper
// ─────────────────────────────────────────────────────────────────────────────
async function verifyOrgMembership(
  supabase: any,
  userId: string,
  orgId: string,
): Promise<void> {
  const { data: member, error } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !member) {
    throw new Error("Access denied: You do not have permission to access analytics for this organization.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Input Schema
// ─────────────────────────────────────────────────────────────────────────────
const analyticsInputSchema = z.object({
  orgId: z.string().uuid(),
  dateRange: z.enum(["7d", "30d", "90d", "6m", "12m", "ytd", "all", "custom"]).default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// getAnalyticsData — Comprehensive Executive & Operational Analytics
// ─────────────────────────────────────────────────────────────────────────────
export const getAnalyticsData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => analyticsInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    // 1. Verify organization membership
    await verifyOrgMembership(supabase, userId, data.orgId);

    // 2. Compute date windows for period comparison
    const { currentStart, currentEnd, previousStart, previousEnd } = computeDateWindows(
      data.dateRange,
      data.startDate,
      data.endDate,
    );

    // 3. Parallel fetching of org-scoped data
    const [
      invoicesRes,
      dealsRes,
      customersRes,
      tasksRes,
      leadsRes,
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, number, amount, status, customer_id, issue_date, due_date, paid_at, created_at")
        .eq("org_id", data.orgId),
      supabase
        .from("deals")
        .select("id, title, value, stage, expected_close, customer_id, created_at")
        .eq("org_id", data.orgId),
      supabase
        .from("customers")
        .select("id, name, company, email, status, created_at")
        .eq("org_id", data.orgId),
      supabase
        .from("tasks")
        .select("id, title, priority, status, due_date, created_at")
        .eq("org_id", data.orgId),
      supabase
        .from("leads")
        .select("id, name, company, score, stage, created_at")
        .eq("org_id", data.orgId),
    ]);

    if (invoicesRes.error) throw new Error(`Invoices error: ${invoicesRes.error.message}`);
    if (dealsRes.error) throw new Error(`Deals error: ${dealsRes.error.message}`);
    if (customersRes.error) throw new Error(`Customers error: ${customersRes.error.message}`);
    if (tasksRes.error) throw new Error(`Tasks error: ${tasksRes.error.message}`);
    if (leadsRes.error) throw new Error(`Leads error: ${leadsRes.error.message}`);

    const allInvoices = invoicesRes.data ?? [];
    const allDeals = dealsRes.data ?? [];
    const allCustomers = customersRes.data ?? [];
    const allTasks = tasksRes.data ?? [];
    const allLeads = leadsRes.data ?? [];

    // Helper: is date within window
    const inWindow = (dateStr: string | null | undefined, start: Date, end: Date) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };

    // ── 4. Revenue & Invoicing Calculations ────────────────────────────────────
    let currentRevenue = 0;
    let previousRevenue = 0;
    let allTimeRevenue = 0;
    let totalBilledInPeriod = 0;
    let outstandingRevenue = 0;
    let overdueRevenue = 0;
    let paidInvoicesCount = 0;
    let overdueInvoicesCount = 0;
    let sentInvoicesCount = 0;

    // Aging breakdown
    let aging0to30 = 0;
    let aging31to60 = 0;
    let aging61to90 = 0;
    let aging90Plus = 0;
    const nowTime = new Date().getTime();

    for (const inv of allInvoices) {
      const amount = Number(inv.amount ?? 0);
      const isPaid = inv.status === "paid";
      const isOverdue = inv.status === "overdue";
      const isSent = inv.status === "sent";

      if (isPaid) {
        allTimeRevenue += amount;
        if (inWindow(inv.paid_at ?? inv.issue_date, currentStart, currentEnd)) {
          currentRevenue += amount;
          paidInvoicesCount++;
        }
        if (inWindow(inv.paid_at ?? inv.issue_date, previousStart, previousEnd)) {
          previousRevenue += amount;
        }
      }

      if (isSent || isOverdue) {
        outstandingRevenue += amount;
      }

      if (isOverdue) {
        overdueRevenue += amount;
        overdueInvoicesCount++;

        // Calculate aging days
        const dueDate = inv.due_date ? new Date(inv.due_date).getTime() : nowTime;
        const daysOverdue = Math.max(0, Math.floor((nowTime - dueDate) / (1000 * 60 * 60 * 24)));
        if (daysOverdue <= 30) aging0to30 += amount;
        else if (daysOverdue <= 60) aging31to60 += amount;
        else if (daysOverdue <= 90) aging61to90 += amount;
        else aging90Plus += amount;
      }

      if (isSent) sentInvoicesCount++;

      if (inWindow(inv.issue_date, currentStart, currentEnd)) {
        totalBilledInPeriod += amount;
      }
    }

    const revenueGrowthRate =
      previousRevenue > 0
        ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
        : currentRevenue > 0
          ? 100
          : 0;

    const collectionRate =
      totalBilledInPeriod > 0 ? Math.min(100, Math.round((currentRevenue / totalBilledInPeriod) * 100)) : 100;

    const avgInvoiceValue =
      paidInvoicesCount > 0 ? Math.round(currentRevenue / paidInvoicesCount) : 0;

    // Monthly revenue trend (last 6 monthly intervals in current range)
    const monthlyTrendMap = new Map<string, { month: string; revenue: number; billed: number; invoices: number }>();
    const monthsBack = data.dateRange === "12m" || data.dateRange === "all" ? 12 : 6;
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
      monthlyTrendMap.set(key, { month: label, revenue: 0, billed: 0, invoices: 0 });
    }

    for (const inv of allInvoices) {
      const amount = Number(inv.amount ?? 0);
      const date = new Date(inv.paid_at ?? inv.issue_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyTrendMap.has(key)) {
        const item = monthlyTrendMap.get(key)!;
        if (inv.status === "paid") {
          item.revenue += amount;
          item.invoices++;
        }
        item.billed += amount;
      }
    }

    const revenueTrend = Array.from(monthlyTrendMap.values());

    // ── 5. Sales & Pipeline Calculations ──────────────────────────────────────
    const openDeals = allDeals.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const openPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

    const wonDeals = allDeals.filter((d) => d.stage === "won");
    const lostDeals = allDeals.filter((d) => d.stage === "lost");
    const totalWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
    const totalLostValue = lostDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

    const closedDealsCount = wonDeals.length + lostDeals.length;
    const winRate =
      closedDealsCount > 0 ? Math.round((wonDeals.length / closedDealsCount) * 100) : 0;

    const avgDealValue =
      allDeals.length > 0
        ? Math.round(
            allDeals.reduce((s, d) => s + Number(d.value ?? 0), 0) / allDeals.length,
          )
        : 0;

    const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
    const salesByStage = stages.map((stage) => {
      const stageDeals = allDeals.filter((d) => d.stage === stage);
      return {
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0),
      };
    });

    // ── 6. Customer Calculations ──────────────────────────────────────────────
    const totalCustomers = allCustomers.length;
    const activeCustomers = allCustomers.filter((c) => c.status === "active").length;
    const prospectCustomers = allCustomers.filter((c) => c.status === "prospect").length;
    const churnedCustomers = allCustomers.filter((c) => c.status === "churned").length;

    const newCustomersInPeriod = allCustomers.filter((c) =>
      inWindow(c.created_at, currentStart, currentEnd),
    ).length;

    const prevCustomersInPeriod = allCustomers.filter((c) =>
      inWindow(c.created_at, previousStart, previousEnd),
    ).length;

    const customerGrowthRate =
      prevCustomersInPeriod > 0
        ? Math.round(((newCustomersInPeriod - prevCustomersInPeriod) / prevCustomersInPeriod) * 100)
        : newCustomersInPeriod > 0
          ? 100
          : 0;

    // Customer spend ranking (top 5)
    const customerSpendMap = new Map<string, { id: string; name: string; company: string; spend: number; invoiceCount: number }>();
    for (const c of allCustomers) {
      customerSpendMap.set(c.id, {
        id: c.id,
        name: c.name,
        company: c.company || "Direct Client",
        spend: 0,
        invoiceCount: 0,
      });
    }

    for (const inv of allInvoices) {
      if (inv.customer_id && inv.status === "paid" && customerSpendMap.has(inv.customer_id)) {
        const entry = customerSpendMap.get(inv.customer_id)!;
        entry.spend += Number(inv.amount ?? 0);
        entry.invoiceCount++;
      }
    }

    const topCustomers = Array.from(customerSpendMap.values())
      .filter((c) => c.spend > 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // ── 7. Task Calculations ──────────────────────────────────────────────────
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === "Completed").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "In Progress").length;
    const todoTasks = allTasks.filter((t) => t.status === "Todo").length;
    const pendingTasks = totalTasks - completedTasks - allTasks.filter((t) => t.status === "Cancelled").length;

    const overdueTasks = allTasks.filter((t) => {
      if (t.status === "Completed" || t.status === "Cancelled" || !t.due_date) return false;
      return new Date(t.due_date).getTime() < nowTime;
    }).length;

    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    const tasksByPriority = ["Urgent", "High", "Medium", "Low"].map((p) => ({
      priority: p,
      total: allTasks.filter((t) => t.priority === p).length,
      completed: allTasks.filter((t) => t.priority === p && t.status === "Completed").length,
    }));

    const tasksByStatus = [
      { status: "Todo", count: todoTasks },
      { status: "In Progress", count: inProgressTasks },
      { status: "Completed", count: completedTasks },
    ];

    // ── 8. AI-Generated Business Insights (Data-Grounded) ─────────────────────
    const insights: Array<{
      id: string;
      category: "revenue" | "sales" | "risk" | "efficiency" | "growth";
      type: "positive" | "warning" | "neutral";
      title: string;
      description: string;
      metric: string;
      actionRecommended?: string;
      generatedBy: "ai-grounded-engine";
    }> = [];

    // Insight 1: Revenue Momentum
    if (revenueGrowthRate > 15) {
      insights.push({
        id: "ins-rev-growth",
        category: "revenue",
        type: "positive",
        title: "Strong Revenue Acceleration",
        description: `Revenue for this period increased by +${revenueGrowthRate}% compared to the prior baseline window, driven by healthy invoice settlement.`,
        metric: `+${revenueGrowthRate}% Growth`,
        actionRecommended: "Reinvest in high-conversion pipeline sources to maintain acceleration.",
        generatedBy: "ai-grounded-engine",
      });
    } else if (revenueGrowthRate < -10) {
      insights.push({
        id: "ins-rev-dip",
        category: "revenue",
        type: "warning",
        title: "Revenue Pace Deceleration",
        description: `Revenue contracted by ${Math.abs(revenueGrowthRate)}% compared to the prior period. Check overdue invoices and deal velocity.`,
        metric: `${revenueGrowthRate}% Decline`,
        actionRecommended: "Follow up on overdue invoices and review stalled deals in proposal/negotiation.",
        generatedBy: "ai-grounded-engine",
      });
    }

    // Insight 2: Overdue Invoices Risk
    if (overdueRevenue > 0) {
      const overduePercent = currentRevenue > 0 ? Math.round((overdueRevenue / (currentRevenue + overdueRevenue)) * 100) : 100;
      insights.push({
        id: "ins-overdue-risk",
        category: "risk",
        type: overduePercent > 20 ? "warning" : "neutral",
        title: `${overdueInvoicesCount} Overdue Invoice${overdueInvoicesCount > 1 ? "s" : ""} Requiring Attention`,
        description: `Uncollected overdue balance represents ₹${overdueRevenue.toLocaleString("en-IN")} across ${overdueInvoicesCount} customer invoice${overdueInvoicesCount > 1 ? "s" : ""}.`,
        metric: `₹${overdueRevenue.toLocaleString("en-IN")} Overdue`,
        actionRecommended: "Send automated payment reminders via WhatsApp or Razorpay payment links.",
        generatedBy: "ai-grounded-engine",
      });
    }

    // Insight 3: Pipeline Conversion Health
    if (openPipelineValue > 0) {
      insights.push({
        id: "ins-pipeline-health",
        category: "sales",
        type: "positive",
        title: "Active Sales Pipeline Depth",
        description: `Your open pipeline stands at ₹${openPipelineValue.toLocaleString("en-IN")} across ${openDeals.length} deals with a ${winRate}% historical win rate.`,
        metric: `₹${openPipelineValue.toLocaleString("en-IN")} Open`,
        actionRecommended: "Prioritize deals in 'Negotiation' stage to lock in quarterly revenue.",
        generatedBy: "ai-grounded-engine",
      });
    }

    // Insight 4: Operational Task Backlog
    if (overdueTasks > 0) {
      insights.push({
        id: "ins-task-overdue",
        category: "efficiency",
        type: "warning",
        title: `${overdueTasks} Overdue Task${overdueTasks > 1 ? "s" : ""} in Workflow Backlog`,
        description: `${overdueTasks} critical action items have passed their scheduled completion date, risking project and client deliverables.`,
        metric: `${overdueTasks} Overdue`,
        actionRecommended: "Reassign urgent overdue tasks to available team members.",
        generatedBy: "ai-grounded-engine",
      });
    } else if (taskCompletionRate >= 80 && totalTasks > 0) {
      insights.push({
        id: "ins-task-velocity",
        category: "efficiency",
        type: "positive",
        title: "High Operational Task Velocity",
        description: `Team is maintaining an ${taskCompletionRate}% task completion rate with zero overdue items.`,
        metric: `${taskCompletionRate}% Completion`,
        actionRecommended: "Operational cadence is healthy. No action required.",
        generatedBy: "ai-grounded-engine",
      });
    }

    // Insight 5: Customer Growth & Retention
    if (newCustomersInPeriod > 0) {
      insights.push({
        id: "ins-customer-growth",
        category: "growth",
        type: "positive",
        title: "Active Account Expansion",
        description: `Acquired ${newCustomersInPeriod} new customer account${newCustomersInPeriod > 1 ? "s" : ""} during this period (+${customerGrowthRate}% vs prior window).`,
        metric: `+${newCustomersInPeriod} New Clients`,
        actionRecommended: "Trigger onboarding SOP workflows to accelerate client activation.",
        generatedBy: "ai-grounded-engine",
      });
    }

    return {
      dateRange: data.dateRange,
      window: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
      },
      kpis: {
        currentRevenue,
        previousRevenue,
        revenueGrowthRate,
        allTimeRevenue,
        outstandingRevenue,
        overdueRevenue,
        collectionRate,
        avgInvoiceValue,
        openPipelineValue,
        openDealsCount: openDeals.length,
        winRate,
        totalWonValue,
        totalLostValue,
        avgDealValue,
        totalCustomers,
        activeCustomers,
        prospectCustomers,
        churnedCustomers,
        newCustomersInPeriod,
        customerGrowthRate,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        taskCompletionRate,
        leadsCount: allLeads.length,
        overdueInvoicesCount,
        paidInvoicesCount,
        sentInvoicesCount,
      },
      charts: {
        revenueTrend,
        salesByStage,
        tasksByPriority,
        tasksByStatus,
        agingBreakdown: [
          { bucket: "0-30 Days", amount: aging0to30 },
          { bucket: "31-60 Days", amount: aging31to60 },
          { bucket: "61-90 Days", amount: aging61to90 },
          { bucket: "90+ Days", amount: aging90Plus },
        ],
        customerBreakdown: [
          { status: "Active", count: activeCustomers },
          { status: "Prospect", count: prospectCustomers },
          { status: "Churned", count: churnedCustomers },
        ],
      },
      topCustomers,
      insights,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// exportAnalyticsCsv — Generates sanitized, org-scoped CSV report
// ─────────────────────────────────────────────────────────────────────────────
export const exportAnalyticsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => analyticsInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    // Verify membership
    await verifyOrgMembership(supabase, userId, data.orgId);

    const { currentStart, currentEnd } = computeDateWindows(
      data.dateRange,
      data.startDate,
      data.endDate,
    );

    const [invoices, deals, customers, tasks] = await Promise.all([
      supabase.from("invoices").select("*").eq("org_id", data.orgId),
      supabase.from("deals").select("*").eq("org_id", data.orgId),
      supabase.from("customers").select("*").eq("org_id", data.orgId),
      supabase.from("tasks").select("*").eq("org_id", data.orgId),
    ]);

    const lines: string[] = [];
    lines.push(`"opteraOS Business Analytics & Performance Report"`);
    lines.push(`"Generated At","${new Date().toISOString()}"`);
    lines.push(`"Date Filter","${data.dateRange}"`);
    lines.push(`"Period Start","${currentStart.toISOString().slice(0, 10)}"`);
    lines.push(`"Period End","${currentEnd.toISOString().slice(0, 10)}"`);
    lines.push("");

    // Section 1: Invoices
    lines.push(`"--- INVOICES ---"`);
    lines.push(`"Invoice #","Amount","Status","Issue Date","Due Date","Paid At"`);
    for (const inv of invoices.data ?? []) {
      lines.push(
        `"${inv.number}","${inv.amount}","${inv.status}","${inv.issue_date}","${inv.due_date ?? ""}","${inv.paid_at ?? ""}"`,
      );
    }
    lines.push("");

    // Section 2: Deals Pipeline
    lines.push(`"--- SALES PIPELINE & DEALS ---"`);
    lines.push(`"Deal Title","Value","Stage","Expected Close"`);
    for (const d of deals.data ?? []) {
      lines.push(`"${d.title.replace(/"/g, '""')}","${d.value}","${d.stage}","${d.expected_close ?? ""}"`);
    }
    lines.push("");

    // Section 3: Customers
    lines.push(`"--- CUSTOMER ACCOUNTS ---"`);
    lines.push(`"Customer Name","Company","Status","Email"`);
    for (const c of customers.data ?? []) {
      lines.push(
        `"${c.name.replace(/"/g, '""')}","${(c.company ?? "").replace(/"/g, '""')}","${c.status}","${c.email ?? ""}"`,
      );
    }
    lines.push("");

    // Section 4: Tasks
    lines.push(`"--- OPERATIONAL TASKS ---"`);
    lines.push(`"Task Title","Priority","Status","Due Date"`);
    for (const t of tasks.data ?? []) {
      lines.push(
        `"${t.title.replace(/"/g, '""')}","${t.priority}","${t.status}","${t.due_date ?? ""}"`,
      );
    }

    return {
      csv: lines.join("\n"),
      filename: `opteraos-analytics-${data.dateRange}-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  });
