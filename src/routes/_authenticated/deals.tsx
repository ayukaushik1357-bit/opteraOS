import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, TrendingUp, CheckCircle2, XCircle, ArrowRight, DollarSign,
  Calendar, Layers, Trophy, AlertCircle, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/components/app/AppShell";
import { dealsApi, pipelinesApi, customersApi, crmAnalyticsApi } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import { appHead } from "@/lib/app-head";
import { EmptyState, PageHeader } from "@/components/shared/ui-kit";

export const Route = createFileRoute("/_authenticated/deals")({
  head: appHead("Sales Pipeline & Opportunities", "Multi-stage pipeline Kanban, weighted revenue, and deal forecasting."),
  component: DealsPage,
});

export function DealsPage() {
  const { current } = useWorkspace();
  const currency = current?.currency || "INR";
  const orgId = current?.id || "";
  const queryClient = useQueryClient();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openLostModal, setOpenLostModal] = useState<any | null>(null);
  const [lostReason, setLostReason] = useState("Price too high");

  const [draft, setDraft] = useState({
    title: "",
    value: 250000,
    customerId: "",
    stageId: "",
    expectedCloseDate: "",
  });

  // Queries
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines", orgId],
    queryFn: () => pipelinesApi.list(orgId),
    enabled: !!orgId,
  });

  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id || "";

  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ["deals_pipeline", orgId, activePipelineId],
    queryFn: () => dealsApi.getPipeline(orgId, activePipelineId || undefined),
    enabled: !!orgId,
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => customersApi.list(orgId, { pageSize: 100 }),
    enabled: !!orgId,
  });

  const { data: forecastData } = useQuery({
    queryKey: ["crm_forecast", orgId, activePipelineId],
    queryFn: () => crmAnalyticsApi.getForecast(orgId, activePipelineId || undefined),
    enabled: !!orgId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      dealsApi.create(orgId, {
        title: draft.title,
        value: Number(draft.value),
        customerId: draft.customerId || undefined,
        pipelineId: activePipelineId,
        stageId: draft.stageId || pipelineData?.stages?.[0]?.id,
        expectedCloseDate: draft.expectedCloseDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Opportunity created");
      setOpenCreate(false);
      setDraft({ title: "", value: 250000, customerId: "", stageId: "", expectedCloseDate: "" });
      queryClient.invalidateQueries({ queryKey: ["deals_pipeline", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_forecast", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to create deal"),
  });

  const moveStageMutation = useMutation({
    mutationFn: (data: { dealId: string; stageId: string }) =>
      dealsApi.moveStage(orgId, data.dealId, { stageId: data.stageId }),
    onSuccess: () => {
      toast.success("Opportunity stage updated");
      queryClient.invalidateQueries({ queryKey: ["deals_pipeline", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_forecast", orgId] });
    },
  });

  const markWonMutation = useMutation({
    mutationFn: (id: string) => dealsApi.markWon(orgId, id),
    onSuccess: () => {
      toast.success("🎉 Opportunity marked as CLOSED WON!");
      queryClient.invalidateQueries({ queryKey: ["deals_pipeline", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_forecast", orgId] });
    },
  });

  const markLostMutation = useMutation({
    mutationFn: () =>
      dealsApi.markLost(orgId, openLostModal.id, { reason: lostReason }),
    onSuccess: () => {
      toast.info("Opportunity marked as CLOSED LOST");
      setOpenLostModal(null);
      queryClient.invalidateQueries({ queryKey: ["deals_pipeline", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_forecast", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsApi.delete(orgId, id),
    onSuccess: () => {
      toast.success("Opportunity deleted");
      queryClient.invalidateQueries({ queryKey: ["deals_pipeline", orgId] });
    },
  });

  const stages = pipelineData?.stages || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Manage multi-pipeline stages, track weighted revenue forecasts, and advance deals to close."
        actions={
          <div className="flex items-center gap-3">
            {pipelines && pipelines.length > 1 && (
              <Select value={activePipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="w-52 bg-white border-[#E5EAF1]">
                  <SelectValue placeholder="Select Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => setOpenCreate(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Opportunity
            </Button>
          </div>
        }
      />

      {/* Forecast Banner */}
      {forecastData?.periods && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl bg-white border border-[#E5EAF1] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div>
            <span className="text-xs font-semibold text-gray-500">This Month Forecast</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {money(forecastData.periods.currentMonth.weightedRevenue, currency)}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Next Month Forecast</span>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {money(forecastData.periods.nextMonth.weightedRevenue, currency)}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">This Quarter Forecast</span>
            <p className="text-xl font-bold text-blue-600 mt-0.5">
              {money(forecastData.periods.thisQuarter.weightedRevenue, currency)}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Weighted Pipeline Total</span>
            <p className="text-xl font-bold text-green-600 mt-0.5">
              {money(forecastData.periods.pipelineTotal.weightedRevenue, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Kanban Stages Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <EmptyState
          title="No stages configured"
          description="Create a pipeline stage or initialize standard pipeline."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {stages.map((stage: any) => (
            <div
              key={stage.id}
              className="flex flex-col rounded-xl border border-[#E5EAF1] bg-[#F8FAFC] p-3.5 min-w-[250px] shadow-xs"
            >
              {/* Stage Header */}
              <div className="flex flex-col gap-1 pb-3 mb-3 border-b border-[#E5EAF1]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color || '#2563EB' }}
                    />
                    {stage.name}
                  </span>
                  <span className="rounded-full bg-white border border-[#E5EAF1] px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                    {stage.count}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{stage.probability}% win prob</span>
                  <span className="font-semibold text-gray-800">
                    {money(stage.totalValue, currency)}
                  </span>
                </div>
              </div>

              {/* Deal Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[620px] pr-0.5">
                {stage.deals.map((deal: any) => (
                  <div
                    key={deal.id}
                    className="group rounded-lg border border-[#E5EAF1] bg-white p-3.5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <p className="font-semibold text-sm text-gray-900 leading-snug">{deal.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {deal.customer?.name || deal.company?.displayName || "Direct Customer"}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">
                        {money(Number(deal.value || 0), currency)}
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Wt: {money(Number(deal.weightedRevenue || 0), currency)}
                      </span>
                    </div>

                    {/* Stage quick move & close buttons */}
                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                      <Select
                        value={deal.stageId || stage.id}
                        onValueChange={(newStageId) =>
                          moveStageMutation.mutate({ dealId: deal.id, stageId: newStageId })
                        }
                      >
                        <SelectTrigger className="h-7 text-[11px] w-28 px-2 bg-muted/40">
                          <SelectValue placeholder="Move Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((s: any) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1">
                        {!stage.isWon && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => markWonMutation.mutate(deal.id)}
                            title="Mark as Won"
                          >
                            <Trophy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {!stage.isLost && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10"
                            onClick={() => setOpenLostModal(deal)}
                            title="Mark as Lost"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => deleteMutation.mutate(deal.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Deal Modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Sales Opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3.5 py-2">
            <div className="grid gap-1.5">
              <Label>Opportunity Title *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Enterprise Subscription & Deployment"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Deal Value ({currency}) *</Label>
                <Input
                  type="number"
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Target Close Date</Label>
                <Input
                  type="date"
                  value={draft.expectedCloseDate}
                  onChange={(e) => setDraft({ ...draft, expectedCloseDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Customer Account</Label>
              <Select
                value={draft.customerId}
                onValueChange={(v) => setDraft({ ...draft, customerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customersData?.rows?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Initial Pipeline Stage</Label>
              <Select
                value={draft.stageId || stages[0]?.id || ""}
                onValueChange={(v) => setDraft({ ...draft, stageId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.probability}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
              disabled={draft.title.trim().length < 2 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create Opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Lost Reason Modal */}
      <Dialog open={!!openLostModal} onOpenChange={() => setOpenLostModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Close Opportunity as Lost</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Loss Reason</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Price too high">Price too high / Budget</SelectItem>
                  <SelectItem value="Competitor chosen">Competitor chosen</SelectItem>
                  <SelectItem value="No decision / Project cancelled">No decision / Cancelled</SelectItem>
                  <SelectItem value="Missing required features">Missing required features</SelectItem>
                  <SelectItem value="Unresponsive">Unresponsive / Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLostModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={markLostMutation.isPending}
              onClick={() => markLostMutation.mutate()}
            >
              Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
