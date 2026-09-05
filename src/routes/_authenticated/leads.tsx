import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, CheckCircle2, XCircle, ArrowRight, UserCheck, Sparkles, AlertTriangle,
  Upload, Users, Filter, RefreshCw, Layers, Table, MoreHorizontal
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
import { leadsApi, pipelinesApi } from "@/lib/api";
import { shortDate, money } from "@/lib/format";
import { appHead } from "@/lib/app-head";
import {
  EmptyState,
  PageHeader,
  Pager,
  SearchInput,
  StatusBadge,
} from "@/components/shared/ui-kit";

export const Route = createFileRoute("/_authenticated/leads")({
  head: appHead("Leads Engine", "Inbound leads with multi-factor scoring, duplicate check, and instant qualification."),
  component: LeadsPage,
});

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"] as const;

const stageTone: Record<string, "positive" | "brand" | "neutral" | "danger" | "warning"> = {
  QUALIFIED: "positive",
  CONTACTED: "brand",
  NEW: "neutral",
  CONVERTED: "positive",
  UNQUALIFIED: "warning",
  LOST: "danger",
};

export function LeadsPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [openCreate, setOpenCreate] = useState(false);
  const [openConvert, setOpenConvert] = useState<any | null>(null);
  const [openAssign, setOpenAssign] = useState<any | null>(null);
  const [openScoreDetails, setOpenScoreDetails] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Draft lead state
  const [draft, setDraft] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "Website Demo",
    expectedRevenue: 100000,
    priority: "MEDIUM",
  });

  // Convert modal state
  const [convertDealTitle, setConvertDealTitle] = useState("");
  const [convertDealValue, setConvertDealValue] = useState<number>(0);

  // Assign modal state
  const [assignStrategy, setAssignStrategy] = useState("ROUND_ROBIN");

  // Duplicate analysis preview state
  const [duplicateMatches, setDuplicateMatches] = useState<any>(null);

  const orgId = current?.id || "";

  // Queries
  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ["leads", orgId, page, stageFilter, query],
    queryFn: () =>
      leadsApi.list(orgId, {
        page,
        pageSize: 15,
        stage: stageFilter !== "all" ? stageFilter : undefined,
        search: query.trim() || undefined,
      }),
    enabled: !!orgId,
  });

  const { data: pipelineData } = useQuery({
    queryKey: ["leads_pipeline", orgId],
    queryFn: () => leadsApi.getPipeline(orgId),
    enabled: !!orgId && viewMode === "kanban",
  });

  const rows = leadsData?.rows || [];
  const total = leadsData?.total || 0;
  const pages = leadsData?.pages || 1;

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => leadsApi.create(orgId, draft),
    onSuccess: () => {
      toast.success("Lead created with AI score");
      setOpenCreate(false);
      setDraft({ name: "", company: "", email: "", phone: "", source: "Website Demo", expectedRevenue: 100000, priority: "MEDIUM" });
      setDuplicateMatches(null);
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to create lead"),
  });

  const qualifyMutation = useMutation({
    mutationFn: (id: string) => leadsApi.qualify(orgId, id),
    onSuccess: () => {
      toast.success("Lead marked as QUALIFIED");
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
    },
  });

  const disqualifyMutation = useMutation({
    mutationFn: (id: string) => leadsApi.disqualify(orgId, id, "Not a current fit"),
    onSuccess: () => {
      toast.info("Lead marked as UNQUALIFIED");
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: () =>
      leadsApi.convert(orgId, openConvert.id, {
        dealTitle: convertDealTitle || `${openConvert.company || openConvert.name} — Opportunity`,
        value: Number(convertDealValue) || Number(openConvert.expectedRevenue) || 0,
      }),
    onSuccess: (res: any) => {
      toast.success("Lead converted into Customer Account & Sales Opportunity!");
      setOpenConvert(null);
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
      queryClient.invalidateQueries({ queryKey: ["deals", orgId] });
      queryClient.invalidateQueries({ queryKey: ["customers", orgId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to convert lead"),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      leadsApi.assign(orgId, openAssign.id, {
        strategy: assignStrategy,
      }),
    onSuccess: (res: any) => {
      toast.success(`Lead assigned to ${res?.owner?.firstName || 'salesperson'}`);
      setOpenAssign(null);
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
    },
  });

  const recalculateScoreMutation = useMutation({
    mutationFn: (id: string) => leadsApi.recalculateScore(orgId, id),
    onSuccess: () => {
      toast.success("Lead AI score recalculated");
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(orgId, id),
    onSuccess: () => {
      toast.success("Lead deleted");
      queryClient.invalidateQueries({ queryKey: ["leads", orgId] });
    },
  });

  const handleDuplicateCheck = async () => {
    if (!draft.email && !draft.phone && !draft.company) return;
    try {
      const res = await leadsApi.checkDuplicates(orgId, {
        email: draft.email || undefined,
        phone: draft.phone || undefined,
        company: draft.company || undefined,
      });
      setDuplicateMatches(res);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads Engine"
        subtitle="Multi-factor AI scoring, automated duplicate analysis, round-robin routing, and one-click opportunity conversion."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-[#E5EAF1] bg-[#F8FAFC] p-1">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setViewMode("table")}
              >
                <Table className="mr-1.5 h-3.5 w-3.5" /> Table
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setViewMode("kanban")}
              >
                <Layers className="mr-1.5 h-3.5 w-3.5" /> Pipeline
              </Button>
            </div>

            <Button
              className="bg-[#008080] hover:bg-[#006666] text-white shadow-teal-sm font-semibold"
              onClick={() => {
                setDraft({ name: "", company: "", email: "", phone: "", source: "Website Demo", expectedRevenue: 100000, priority: "MEDIUM" });
                setOpenCreate(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Create Lead
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            label="Search leads"
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Search by name, company, email..."
          />
          <Select
            value={stageFilter}
            onValueChange={(v) => {
              setStageFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48 bg-white border-[rgba(0,128,128,0.2)] text-[#0F2423]" aria-label="Filter by stage">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 border-[rgba(0,128,128,0.2)] text-[#0F2423] hover:border-[#008080] hover:bg-[rgba(0,128,128,0.04)]">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#008080]" /> Refresh
          </Button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === "table" ? (
        isLoading ? (
          <div className="grid gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No leads found"
            description="Create your first lead or import from CSV to start scoring and converting."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[rgba(0,128,128,0.14)] bg-white shadow-teal-xs">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-[rgba(0,128,128,0.03)] text-left text-xs uppercase tracking-wider text-[#617D7B] font-semibold border-b border-[rgba(0,128,128,0.1)]">
                <tr>
                  <th className="px-4 py-3.5">Lead Details</th>
                  <th className="px-4 py-3.5">Source & Priority</th>
                  <th className="px-4 py-3.5">AI Score</th>
                  <th className="px-4 py-3.5">Stage</th>
                  <th className="px-4 py-3.5">Expected Value</th>
                  <th className="px-4 py-3.5">Assigned Owner</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,128,128,0.08)]">
                {rows.map((l: any) => (
                  <tr key={l.id} className="hover:bg-[rgba(0,128,128,0.02)] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#0F2423]">{l.name}</p>
                      <p className="text-xs text-[#617D7B]">{l.company || l.email || "No company"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#3D5A58] font-medium">{l.source || "Direct"}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${l.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-600' : 'bg-[#EDF4F3] text-[#3D5A58]'}`}>
                          {l.priority || 'MED'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setOpenScoreDetails(l)}
                        className="flex items-center gap-1.5 rounded-lg bg-[rgba(0,128,128,0.08)] hover:bg-[rgba(0,128,128,0.15)] px-2.5 py-1 text-xs font-semibold text-[#008080] transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{l.score ?? 50}/100</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge label={l.stage} tone={stageTone[l.stage] || "neutral"} />
                    </td>
                    <td className="px-4 py-3.5 tabular-nums font-bold text-[#0F2423]">
                      {money(Number(l.expectedRevenue || 0), current?.currency || 'INR')}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#617D7B]">
                      {l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : "Unassigned"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {l.stage !== "QUALIFIED" && l.stage !== "CONVERTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            onClick={() => qualifyMutation.mutate(l.id)}
                            title="Mark as Qualified"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" /> Qualify
                          </Button>
                        )}
                        {l.stage !== "CONVERTED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-[#008080] border-[rgba(0,128,128,0.3)] hover:bg-[rgba(0,128,128,0.06)] font-medium"
                            onClick={() => {
                              setOpenConvert(l);
                              setConvertDealTitle(`${l.company || l.name} — Opportunity`);
                              setConvertDealValue(Number(l.expectedRevenue) || 100000);
                            }}
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-1" /> Convert
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[#617D7B] hover:text-[#0F2423] hover:bg-[rgba(0,128,128,0.06)]"
                          onClick={() => setOpenAssign(l)}
                          title="Assign Lead"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => deleteMutation.mutate(l.id)}
                          title="Delete Lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Kanban Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stg) => {
            const list = (pipelineData as any)?.[stg] || [];
            return (
              <div key={stg} className="flex flex-col rounded-xl border border-[#E5EAF1] bg-[#F8FAFC] p-3 min-w-[220px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5EAF1]">
                  <span className="text-xs font-bold tracking-wider text-gray-600">{stg}</span>
                  <span className="rounded-full bg-white border border-[#E5EAF1] px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[600px]">
                  {list.map((lead: any) => (
                    <div
                      key={lead.id}
                      className="rounded-lg border border-[#E5EAF1] bg-white p-3 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => setOpenScoreDetails(lead)}
                    >
                      <p className="font-semibold text-sm text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.company || lead.email}</p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          ★ {lead.score}/100
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-gray-800">
                          {money(Number(lead.expectedRevenue || 0), current?.currency || 'INR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "table" && <Pager page={page} pages={pages} onPage={setPage} />}

      {/* Create Lead Modal */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md bg-white border border-[rgba(0,128,128,0.2)] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#0F2423] font-bold text-lg">Create New Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-[#0F2423]">Lead Contact Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Sarah Connor"
                className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-[#0F2423]">Company Name</Label>
              <Input
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                onBlur={handleDuplicateCheck}
                placeholder="Cyberdyne Systems"
                className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-[#0F2423]">Work Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  onBlur={handleDuplicateCheck}
                  placeholder="sarah@company.com"
                  className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-[#0F2423]">Phone Number</Label>
                <Input
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  onBlur={handleDuplicateCheck}
                  placeholder="+91 9876543210"
                  className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-[#0F2423]">Lead Source</Label>
                <Input
                  value={draft.source}
                  onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                  placeholder="Website, Referral, Inbound..."
                  className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-[#0F2423]">Expected Revenue</Label>
                <Input
                  type="number"
                  value={draft.expectedRevenue}
                  onChange={(e) => setDraft({ ...draft, expectedRevenue: Number(e.target.value) })}
                  className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                />
              </div>
            </div>

            {/* Real-time duplicate analysis warning */}
            {duplicateMatches && duplicateMatches.status !== "NONE" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Potential Duplicates Found ({duplicateMatches.count})</span>
                </div>
                <ul className="mt-1.5 space-y-1 list-disc pl-4 text-[#3D5A58]">
                  {duplicateMatches.matches.slice(0, 3).map((m: any, idx: number) => (
                    <li key={idx}>
                      Matching {m.type} '{m.name}' via {m.matchType}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)} className="border-[rgba(0,128,128,0.2)] text-[#0F2423]">
              Cancel
            </Button>
            <Button
              className="bg-[#008080] text-white hover:bg-[#006666] shadow-teal-sm font-semibold"
              disabled={draft.name.trim().length < 2 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save & Score Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Lead Modal */}
      <Dialog open={!!openConvert} onOpenChange={() => setOpenConvert(null)}>
        <DialogContent className="max-w-md bg-white border border-[rgba(0,128,128,0.2)] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#0F2423] font-bold text-lg">Convert Lead to Opportunity</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#617D7B]">
            This will atomically create a verified Customer account, Primary Contact, Company record, and Sales Opportunity.
          </p>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-[#0F2423]">Opportunity Title</Label>
              <Input
                value={convertDealTitle}
                onChange={(e) => setConvertDealTitle(e.target.value)}
                className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-[#0F2423]">Deal Value ({current?.currency || 'INR'})</Label>
              <Input
                type="number"
                value={convertDealValue}
                onChange={(e) => setConvertDealValue(Number(e.target.value))}
                className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenConvert(null)} className="border-[rgba(0,128,128,0.2)] text-[#0F2423]">
              Cancel
            </Button>
            <Button
              className="bg-[#008080] hover:bg-[#006666] text-white shadow-teal-sm font-semibold"
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              Convert Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal */}
      <Dialog open={!!openAssign} onOpenChange={() => setOpenAssign(null)}>
        <DialogContent className="max-w-sm bg-white border border-[rgba(0,128,128,0.2)] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#0F2423] font-bold text-lg">Assign Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-[#0F2423]">Assignment Strategy</Label>
              <Select value={assignStrategy} onValueChange={setAssignStrategy}>
                <SelectTrigger className="border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUND_ROBIN">Round Robin (Even Distribution)</SelectItem>
                  <SelectItem value="LOAD_BASED">Load Based (Least Active Deals)</SelectItem>
                  <SelectItem value="MANUAL">Manual Selection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAssign(null)} className="border-[rgba(0,128,128,0.2)] text-[#0F2423]">
              Cancel
            </Button>
            <Button
              className="bg-[#008080] text-white hover:bg-[#006666] shadow-teal-sm font-semibold"
              disabled={assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Execute Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Score Details Modal */}
      <Dialog open={!!openScoreDetails} onOpenChange={() => setOpenScoreDetails(null)}>
        <DialogContent className="max-w-md bg-white border border-[rgba(0,128,128,0.2)] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0F2423] font-bold text-lg">
              <Sparkles className="h-5 w-5 text-[#008080]" />
              AI Lead Score Analysis
            </DialogTitle>
          </DialogHeader>
          {openScoreDetails && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[rgba(0,128,128,0.08)] border border-[rgba(0,128,128,0.2)]">
                <div>
                  <p className="text-xs font-semibold text-[#008080] uppercase tracking-wider">Computed Score</p>
                  <p className="text-3xl font-black text-[#008080]">{openScoreDetails.score ?? 50}/100</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-[rgba(0,128,128,0.3)] text-[#008080] hover:bg-[rgba(0,128,128,0.08)]"
                  onClick={() => recalculateScoreMutation.mutate(openScoreDetails.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recalculate
                </Button>
              </div>

              <div>
                <p className="text-xs font-bold text-[#617D7B] uppercase tracking-wider mb-2">Scoring Factor Breakdown</p>
                <div className="space-y-2">
                  {openScoreDetails.scoringFactors && typeof openScoreDetails.scoringFactors === 'object' ? (
                    Object.entries(openScoreDetails.scoringFactors).map(([k, v]: any) => (
                      <div key={k} className="flex items-center justify-between p-2.5 rounded-xl border border-[rgba(0,128,128,0.14)] bg-[#EDF4F3]/40 text-xs">
                        <span className="font-semibold text-[#0F2423]">{v?.reason || k}</span>
                        <span className="font-bold text-emerald-600">+{v?.points || 0} pts</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#617D7B]">Standard base rule scoring applied.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
