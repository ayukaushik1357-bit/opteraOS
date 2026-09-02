import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Clock,
  Briefcase,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  Loader2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/app/AppShell";
import { projectsApi, customersApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "Projects & Timesheets — opteraOS";
const description = "Project management, timesheet logging, resource allocation, and field service orders.";

export const Route = createFileRoute("/_authenticated/projects")({
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
  component: ProjectsMasterPage,
});

function ProjectsMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("projects");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTimesheetOpen, setNewTimesheetOpen] = useState(false);

  // Queries
  const { data: projRes, isLoading: loadingProj } = useQuery({
    queryKey: ["projects_list", orgId],
    queryFn: () => projectsApi.getProjects(orgId),
    enabled: !!orgId,
  });
  const projects = projRes?.rows || [];

  const { data: timesheetRes, isLoading: loadingTs } = useQuery({
    queryKey: ["timesheets_list", orgId],
    queryFn: () => projectsApi.getTimesheets(orgId),
    enabled: !!orgId,
  });
  const timesheets = timesheetRes?.rows || [];

  const { data: fsoRes } = useQuery({
    queryKey: ["field_service_orders", orgId],
    queryFn: () => projectsApi.getFieldServiceOrders(orgId),
    enabled: !!orgId,
  });
  const fsoOrders = fsoRes?.rows || [];

  const { data: custRes } = useQuery({
    queryKey: ["customers_list", orgId],
    queryFn: () => customersApi.list(orgId),
    enabled: !!orgId,
  });
  const customers = custRes?.rows || custRes || [];

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (dto: any) => projectsApi.createProject(orgId, dto),
    onSuccess: () => {
      toast.success("Project workspace created!");
      setNewProjectOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects_list", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create project"),
  });

  const logTimesheetMutation = useMutation({
    mutationFn: (dto: any) => projectsApi.logTimesheet(orgId, dto),
    onSuccess: () => {
      toast.success("Timesheet logged successfully!");
      setNewTimesheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timesheets_list", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to log timesheet"),
  });

  // State for Project form
  const [pName, setPName] = useState("");
  const [pCustomerId, setPCustomerId] = useState("");
  const [pBudget, setPBudget] = useState("50000");
  const [pDesc, setPDesc] = useState("");

  // State for Timesheet form
  const [tsProjectId, setTsProjectId] = useState("");
  const [tsHours, setTsHours] = useState("4");
  const [tsDesc, setTsDesc] = useState("");

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Projects &amp; Timesheets
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Track client delivery projects, log billable timesheets, and dispatch field service orders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewTimesheetOpen(true)}
            className="text-xs h-9"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" /> Log Hours
          </Button>

          <Button
            size="sm"
            onClick={() => setNewProjectOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm text-xs h-9 font-medium"
          >
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F8FAFC] border border-[#E5EAF1] p-1">
          <TabsTrigger value="projects" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <FolderKanban className="h-3.5 w-3.5" /> Active Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="timesheets" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Clock className="h-3.5 w-3.5" /> Timesheets ({timesheets.length})
          </TabsTrigger>
          <TabsTrigger value="field_service" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <MapPin className="h-3.5 w-3.5" /> Field Service Orders ({fsoOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Projects ─────────────────────────────────────────────────────── */}
        <TabsContent value="projects" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Project Workspaces</h2>
              <span className="text-xs text-gray-500">{projects.length} projects</span>
            </div>

            {loadingProj ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-12 text-center">
                <FolderKanban className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Projects Created Yet</p>
                <p className="text-xs text-gray-500 mt-1">Create a project workspace to track deliverables, milestones, and billable hours.</p>
                <Button size="sm" onClick={() => setNewProjectOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Create First Project
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Code</TableHead>
                    <TableHead className="text-gray-500">Project Name</TableHead>
                    <TableHead className="text-gray-500">Client / Customer</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-gray-500">Budget</TableHead>
                    <TableHead className="text-gray-500">Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {projects.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{p.code}</TableCell>
                      <TableCell className="text-xs text-gray-900 font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-gray-600">{p.customer?.name || "Internal"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-900 font-semibold">
                        {currency} {Number(p.budget).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {p._count?.tasks || 0} tasks • {p._count?.timesheets || 0} time entries
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 2. Timesheets ───────────────────────────────────────────────────── */}
        <TabsContent value="timesheets" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Employee &amp; Resource Timesheets</h2>
                <p className="text-xs text-gray-500">Track billable operational hours against active projects</p>
              </div>
              <Button size="sm" onClick={() => setNewTimesheetOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Log Hours
              </Button>
            </div>

            {loadingTs ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : timesheets.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Timesheets Logged</p>
                <p className="text-xs text-gray-500 mt-1">Log worked hours against projects to track resource utilization.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Date</TableHead>
                    <TableHead className="text-gray-500">Team Member</TableHead>
                    <TableHead className="text-gray-500">Project</TableHead>
                    <TableHead className="text-gray-500">Description</TableHead>
                    <TableHead className="text-right text-gray-500">Hours Logged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {timesheets.map((ts: any) => (
                    <TableRow key={ts.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs text-gray-500">{shortDate(ts.date)}</TableCell>
                      <TableCell className="text-xs font-medium text-gray-900">
                        {ts.user ? `${ts.user.firstName} ${ts.user.lastName}` : "Team Member"}
                      </TableCell>
                      <TableCell className="text-xs text-blue-600 font-semibold">{ts.project?.name || "General"}</TableCell>
                      <TableCell className="text-xs text-gray-600">{ts.description || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-green-700 font-bold">
                        {ts.hours} hrs
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 3. Field Service ────────────────────────────────────────────────── */}
        <TabsContent value="field_service" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 text-center">
            <MapPin className="h-10 w-10 text-blue-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Field Service &amp; Dispatch Orders</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Dispatch on-site technicians, track appointments, and capture client digital signatures upon completion.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: New Project ─────────────────────────────────────────────── */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Project Name</Label>
              <Input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="e.g. Enterprise Cloud ERP Migration"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Customer (Optional)</Label>
              <select
                value={pCustomerId}
                onChange={(e) => setPCustomerId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Internal Project / Select Customer --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company || "Client"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-700">Estimated Budget ({currency})</Label>
              <Input
                type="number"
                value={pBudget}
                onChange={(e) => setPBudget(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Description</Label>
              <Input
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                placeholder="Objectives and scope of work"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!pName) {
                  toast.error("Please provide project name.");
                  return;
                }
                createProjectMutation.mutate({
                  name: pName,
                  customerId: pCustomerId || undefined,
                  budget: Number(pBudget),
                  description: pDesc,
                });
              }}
              disabled={createProjectMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Log Timesheet ───────────────────────────────────────────── */}
      <Dialog open={newTimesheetOpen} onOpenChange={setNewTimesheetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Worked Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Select Project</Label>
              <select
                value={tsProjectId}
                onChange={(e) => setTsProjectId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Project --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-700">Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={tsHours}
                onChange={(e) => setTsHours(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Work Activity Description</Label>
              <Input
                value={tsDesc}
                onChange={(e) => setTsDesc(e.target.value)}
                placeholder="e.g. Backend API domain services development"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTimesheetOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const h = Number(tsHours);
                if (h <= 0) {
                  toast.error("Please enter positive hours.");
                  return;
                }
                logTimesheetMutation.mutate({
                  projectId: tsProjectId || undefined,
                  hours: h,
                  description: tsDesc,
                });
              }}
              disabled={logTimesheetMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Save Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
