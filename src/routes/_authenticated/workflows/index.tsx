import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Briefcase,
  Users,
  Sliders,
  CheckSquare,
  Layers,
  BarChart3,
  Plus,
  Trash2,
  Clock,
  Copy,
  MoreVertical,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/app/AppShell";
import {
  listWorkflows,
  toggleWorkflow,
  duplicateWorkflow,
  deleteWorkflow,
  listWorkflowExecutions,
} from "@/lib/workflows.functions";
import { getAutopilotDashboard } from "@/lib/autopilot.functions";
import { shortDate } from "@/lib/format";
import { ExecutionHistoryDrawer } from "@/components/workflows/ExecutionHistoryDrawer";
import { AutopilotCommandCenter } from "@/components/autopilot/AutopilotCommandCenter";
import { AutopilotSidebar, type WorkFilterType } from "@/components/autopilot/AutopilotSidebar";
import { CapabilityDetailModal } from "@/components/autopilot/CapabilityDetailModal";
import { AutopilotDiscovery } from "@/components/autopilot/AutopilotDiscovery";
import { WorkGroupsManager } from "@/components/autopilot/WorkGroupsManager";
import { CustomerGroupsManager } from "@/components/autopilot/CustomerGroupsManager";
import { AssignmentControlCenter } from "@/components/autopilot/AssignmentControlCenter";
import { DailyBusinessReportModal } from "@/components/autopilot/DailyBusinessReportModal";
import { UnifiedWorkManager } from "@/components/autopilot/UnifiedWorkManager";
import { type CapabilityDefinition } from "@/lib/capabilities.config";

const title = "opteraOS Autopilot — Autonomous Business Operating System";
const description = "Tell opteraOS what work needs to happen. It discovers required work, assigns to employee work groups, executes automated actions, and reports results.";

export const Route = createFileRoute("/_authenticated/workflows/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AutopilotMasterPage,
});

function AutopilotMasterPage() {
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("command");
  const [activeWorkFilter, setActiveWorkFilter] = useState<WorkFilterType>("all_work");
  const [selectedCapability, setSelectedCapability] = useState<CapabilityDefinition | null>(null);
  const [capabilityModalOpen, setCapabilityModalOpen] = useState(false);
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Advanced node builder data
  const fetchWorkflows = useServerFn(listWorkflows);
  const fetchExecutions = useServerFn(listWorkflowExecutions);
  const fetchDashboard = useServerFn(getAutopilotDashboard);
  const toggle = useServerFn(toggleWorkflow);
  const duplicate = useServerFn(duplicateWorkflow);
  const remove = useServerFn(deleteWorkflow);

  const { data: dashboardData } = useQuery({
    queryKey: ["autopilot_dashboard", current?.id],
    queryFn: () => fetchDashboard({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: ["workflows", current?.id],
    queryFn: () => fetchWorkflows({ data: { orgId: current!.id } }),
    enabled: !!current && activeTab === "advanced",
  });

  const { data: executions = [], isLoading: loadingExec } = useQuery({
    queryKey: ["workflow_executions", current?.id],
    queryFn: () => fetchExecutions({ data: { orgId: current!.id } }),
    enabled: !!current && (activeTab === "advanced" || historyOpen),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggle({ data: { id, active } }),
    onSuccess: () => {
      toast.success("Workflow status updated");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicate({ data: { id, orgId: current!.id } }),
    onSuccess: (res: any) => {
      toast.success("Workflow duplicated");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
      if (res?.id) {
        navigate({ to: "/workflows/$workflowId", params: { workflowId: res.id } });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Workflow deleted");
      queryClient.invalidateQueries({ queryKey: ["workflows", current?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSelectCapability(cap: CapabilityDefinition) {
    setSelectedCapability(cap);
    setCapabilityModalOpen(true);
  }

  function handleSelectWorkFilter(filter: WorkFilterType) {
    setActiveWorkFilter(filter);
    setActiveTab("command");
  }

  const orgId = current?.id || "00000000-0000-0000-0000-000000000001";
  const currency = current?.currency || "INR";
  const kpis = dashboardData?.kpis;

  const sidebarCounts = {
    allWork: (kpis?.totalAutopilots ?? 0) + (kpis?.totalPendingWork ?? 0),
    running: kpis?.activeAutopilots ?? 0,
    scheduled: kpis?.totalAutopilots ? Math.max(0, kpis.totalAutopilots - (kpis.activeAutopilots ?? 0)) : 0,
    paused: (kpis?.totalAutopilots ?? 0) - (kpis?.activeAutopilots ?? 0),
    failed: kpis?.attentionCount ?? 0,
    completed: kpis?.workCompletedToday ?? 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(0,128,128,0.14)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[rgba(0,128,128,0.12)] text-[#008080] border border-[rgba(0,128,128,0.22)]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0F2423]">
                opteraOS Autopilot
              </h1>
              <p className="mt-0.5 text-xs text-[#5A7573]">
                The autonomous business core. AI understands requests, assigns work to teams, executes actions, and reports results.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDailyReportOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium border-[rgba(0,128,128,0.2)] bg-white text-[#0F2423] hover:bg-[rgba(0,128,128,0.06)] hover:text-[#008080] shadow-xs"
          >
            <BarChart3 className="h-3.5 w-3.5 text-[#008080]" />
            <span>Executive Briefing</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium border-[rgba(0,128,128,0.2)] bg-white text-[#0F2423] hover:bg-[rgba(0,128,128,0.06)] hover:text-[#008080] shadow-xs"
          >
            <Clock className="h-3.5 w-3.5 text-[#5A7573]" />
            <span>Execution Logs</span>
          </Button>
        </div>
      </div>

      {/* ── Master Platform Navigation Tabs ───────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-10 w-full justify-start overflow-x-auto rounded-lg border border-[rgba(0,128,128,0.15)] bg-[#E8F1F0] p-1">
          <TabsTrigger value="command" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#008080]" />
            <span>Command Center</span>
          </TabsTrigger>

          <TabsTrigger value="discovery" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Zap className="h-3.5 w-3.5 text-[#D97706]" />
            <span>Capabilities Catalog</span>
          </TabsTrigger>

          <TabsTrigger value="workgroups" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Briefcase className="h-3.5 w-3.5 text-[#6366F1]" />
            <span>Employee Work Groups</span>
          </TabsTrigger>

          <TabsTrigger value="customergroups" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Users className="h-3.5 w-3.5 text-[#008080]" />
            <span>Customer Segments</span>
          </TabsTrigger>

          <TabsTrigger value="rules" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Sliders className="h-3.5 w-3.5 text-[#059669]" />
            <span>Routing Rules</span>
          </TabsTrigger>

          <TabsTrigger value="work" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <CheckSquare className="h-3.5 w-3.5 text-[#E11D48]" />
            <span>Unified Work Items</span>
          </TabsTrigger>

          <TabsTrigger value="advanced" className="gap-2 text-xs rounded-md text-[#5A7573] data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:font-semibold data-[state=active]:shadow-xs ml-auto">
            <Layers className="h-3.5 w-3.5 text-[#5A7573]" />
            <span>Advanced Builder</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: COMMAND CENTER (With Left Sidebar) ─────────────────── */}
        <TabsContent value="command" className="mt-0 focus-visible:outline-none">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <AutopilotSidebar
              activeFilter={activeWorkFilter}
              onSelectFilter={handleSelectWorkFilter}
              onSelectCapability={handleSelectCapability}
              selectedCapabilityId={selectedCapability?.id}
              counts={sidebarCounts}
            />

            <div className="flex-1 min-w-0 w-full">
              <AutopilotCommandCenter
                orgId={orgId}
                currency={currency}
                onNavigateTab={setActiveTab}
                onOpenDailyReport={() => setDailyReportOpen(true)}
                activeWorkFilter={activeWorkFilter}
                onSelectWorkFilter={setActiveWorkFilter}
                onOpenCapabilityModal={handleSelectCapability}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: CAPABILITIES CATALOG ─────────────────────────────── */}
        <TabsContent value="discovery" className="mt-0 focus-visible:outline-none">
          <AutopilotDiscovery
            orgId={orgId}
            onNavigateCommandCenter={() => setActiveTab("command")}
          />
        </TabsContent>

        {/* ── TAB 3: WORK GROUPS ───────────────────────────────────────── */}
        <TabsContent value="workgroups" className="mt-0 focus-visible:outline-none">
          <WorkGroupsManager orgId={orgId} />
        </TabsContent>

        {/* ── TAB 4: CUSTOMER SEGMENTS ─────────────────────────────────── */}
        <TabsContent value="customergroups" className="mt-0 focus-visible:outline-none">
          <CustomerGroupsManager orgId={orgId} />
        </TabsContent>

        {/* ── TAB 5: ROUTING RULES ─────────────────────────────────────── */}
        <TabsContent value="rules" className="mt-0 focus-visible:outline-none">
          <AssignmentControlCenter orgId={orgId} />
        </TabsContent>

        {/* ── TAB 6: UNIFIED WORK ITEMS ────────────────────────────────── */}
        <TabsContent value="work" className="mt-0 focus-visible:outline-none">
          <UnifiedWorkManager orgId={orgId} />
        </TabsContent>

        {/* ── TAB 7: ADVANCED NODE BUILDER ─────────────────────────────── */}
        <TabsContent value="advanced" className="mt-0 focus-visible:outline-none">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span>Advanced Node Workflows</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Visual node graphs with triggers, logic branches, and tool connectors for power users.
                </p>
              </div>

              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-[#008080] hover:bg-[#006666] text-white text-xs shadow-teal-xs"
              >
                <Link to="/workflows/new">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Visual Canvas</span>
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              {loadingWorkflows ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : workflows.length === 0 ? (
                <div className="p-10 text-center text-xs text-gray-500">
                  No visual workflows created yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-secondary/20">
                      <TableHead className="text-xs font-semibold">Workflow</TableHead>
                      <TableHead className="text-xs font-semibold">Trigger</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((wf) => (
                      <TableRow key={wf.id} className="border-white/5 hover:bg-secondary/20">
                        <TableCell>
                          <Link
                            to="/workflows/$workflowId"
                            params={{ workflowId: wf.id }}
                            className="font-medium text-foreground hover:text-indigo-400"
                          >
                            {wf.name}
                          </Link>
                          {wf.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{wf.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                            {wf.trigger_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={wf.active}
                              onCheckedChange={(active) => toggleMutation.mutate({ id: wf.id, active })}
                              disabled={toggleMutation.isPending}
                            />
                            <span className="text-xs text-muted-foreground">{wf.active ? "Active" : "Draft"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {shortDate(wf.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              <Link to="/workflows/$workflowId" params={{ workflowId: wf.id }}>
                                Open Canvas
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(wf.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Capability Detail Modal (When user clicks any capability) ─── */}
      <CapabilityDetailModal
        open={capabilityModalOpen}
        onOpenChange={setCapabilityModalOpen}
        capability={selectedCapability}
        orgId={orgId}
      />

      {/* ── Daily Business Executive Report Modal ────────────────────── */}
      <DailyBusinessReportModal
        orgId={orgId}
        open={dailyReportOpen}
        onOpenChange={setDailyReportOpen}
      />

      {/* ── Execution History Logs Drawer ────────────────────────────── */}
      <ExecutionHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        executions={executions as any}
        isLoading={loadingExec}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["workflow_executions", orgId] })}
      />
    </div>
  );
}
