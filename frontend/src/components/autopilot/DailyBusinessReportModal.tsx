import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Copy,
  TrendingUp,
  DollarSign,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateDailyBusinessReport } from "@/lib/autopilot.functions";

interface DailyBusinessReportModalProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyBusinessReportModal({
  orgId,
  open,
  onOpenChange,
}: DailyBusinessReportModalProps) {
  const fetchReport = useServerFn(generateDailyBusinessReport);
  const [requestEmail, setRequestEmail] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["daily_business_report", orgId, requestEmail],
    queryFn: () =>
      fetchReport({
        data: {
          orgId,
          sendEmail: requestEmail,
        },
      }),
    enabled: open && !!orgId,
  });

  const m = data?.metrics;
  const curr = m?.currency || "₹";
  const emailDelivery = data?.emailDelivery;

  function handleCopySummary() {
    if (!data) return;
    const lines = [
      `📊 OPTERAOS DAILY EXECUTIVE BUSINESS BRIEFING`,
      `Date: ${data.reportDate}`,
      `Collected Revenue: ${curr} ${m?.collectedRevenue.toLocaleString()}`,
      `Active Pipeline Value: ${curr} ${m?.pipelineValue.toLocaleString()} (${m?.openDealsCount} deals)`,
      `Active Customers: ${m?.activeCustomers} | Open Leads: ${m?.openLeads}`,
      `Pending Unified Work: ${m?.pendingTasksCount} tasks (${m?.urgentTasksCount} urgent)`,
      `Overdue Invoices: ${curr} ${m?.overdueAmount.toLocaleString()} across ${m?.overdueCount} bills`,
      ``,
      `STRATEGIC INSIGHTS:`,
      ...data.strategicNotes.map((n: string) => `• ${n}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Executive briefing copied to clipboard");
  }

  function handleSendEmailTest() {
    setRequestEmail(true);
    refetch().then((res) => {
      const delivery = res.data?.emailDelivery;
      if (delivery?.delivered) {
        toast.success(`Email dispatched via ${delivery.provider}!`);
      } else {
        toast.info(delivery?.message || "Briefing generated. External email skipped (no provider configured).");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
        <DialogHeader className="border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-bold text-[#111827]">Daily Executive Business Briefing</DialogTitle>
            </div>
            {data && (
              <Badge variant="outline" className="font-mono text-[10px] border-blue-200 text-blue-700 bg-blue-50/50">
                {data.reportDate}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-[#6B7280]">
            Autonomous intelligence summary aggregated from live Supabase business data across all departments.
          </DialogDescription>
        </DialogHeader>

        {isLoading || isRefetching ? (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs text-[#6B7280]">Synthesizing live business metrics across CRM, invoices, and pipeline...</p>
          </div>
        ) : !data ? (
          <div className="py-6 text-center text-xs text-[#6B7280]">Unable to generate report.</div>
        ) : (
          <div className="space-y-5 py-2 text-xs">
            {/* ── Key Metrics Overview ────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 shadow-xs">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Collected Rev</span>
                <p className="mt-1 text-base font-bold text-emerald-700 font-mono">
                  {curr} {m?.collectedRevenue.toLocaleString()}
                </p>
                <span className="text-[10px] text-[#9CA3AF]">Settled invoices</span>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 shadow-xs">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Active Pipeline</span>
                <p className="mt-1 text-base font-bold text-blue-700 font-mono">
                  {curr} {m?.pipelineValue.toLocaleString()}
                </p>
                <span className="text-[10px] text-[#9CA3AF]">{m?.openDealsCount} open deals</span>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 shadow-xs">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Customers & Leads</span>
                <p className="mt-1 text-base font-bold text-cyan-800 font-mono">
                  {m?.activeCustomers} / {m?.openLeads}
                </p>
                <span className="text-[10px] text-[#9CA3AF]">Active / Pipeline</span>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 shadow-xs">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold">Pending Work</span>
                <p className="mt-1 text-base font-bold text-amber-700 font-mono">
                  {m?.pendingTasksCount}
                </p>
                <span className="text-[10px] text-amber-600">{m?.urgentTasksCount} high priority</span>
              </div>
            </div>

            {/* ── Strategic AI Executive Notes ────────────────────────────── */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-xs">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>Executive Strategic Insights</span>
              </div>

              <div className="space-y-2 text-xs">
                {data.strategicNotes.map((note: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 rounded-lg bg-white p-2.5 text-[#374151] border border-blue-100 shadow-xs">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="leading-relaxed">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Cash Flow Status ────────────────────────────────────────── */}
            {m && m.overdueCount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-900 font-medium">Overdue Collections:</span>
                </div>
                <span className="font-mono text-amber-800 font-bold">
                  {curr} {m.overdueAmount.toLocaleString()} ({m.overdueCount} invoices)
                </span>
              </div>
            )}

            {/* ── Delivery Transparency Banner ────────────────────────────── */}
            {emailDelivery && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-start gap-2 text-[11px]">
                <Mail className="h-4 w-4 text-[#6B7280] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#111827]">Email Delivery Verification:</span>
                  <p className="text-[#6B7280] leading-relaxed">{emailDelivery.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:gap-0 border-t border-[#E2E8F0] pt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-xs border-[#CBD5E1] bg-white text-[#374151] hover:bg-slate-50 gap-1.5 font-medium"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>Regenerate Live</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmailTest}
              disabled={isRefetching}
              className="text-xs border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 gap-1.5 font-medium"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Test Email Delivery</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs border-[#CBD5E1] bg-white text-[#374151] hover:bg-slate-50 gap-1.5 font-medium"
            >
              <Copy className="h-3.5 w-3.5 text-[#6B7280]" />
              <span>Copy Briefing</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
