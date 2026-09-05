import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LifeBuoy,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  MessageSquare,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { helpdeskApi, customersApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "Helpdesk & Customer Support — opteraOS";
const description = "Manage support tickets, automated SLA tracking, customer inquiries, and ticket resolution.";

export const Route = createFileRoute("/_authenticated/helpdesk")({
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
  component: HelpdeskMasterPage,
});

function HelpdeskMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const queryClient = useQueryClient();

  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Queries
  const { data: ticketRes, isLoading } = useQuery({
    queryKey: ["helpdesk_tickets", orgId, search, statusFilter],
    queryFn: () => helpdeskApi.getTickets(orgId, { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }),
    enabled: !!orgId,
  });
  const tickets = ticketRes?.rows || [];

  const { data: custRes } = useQuery({
    queryKey: ["customers_list", orgId],
    queryFn: () => customersApi.list(orgId),
    enabled: !!orgId,
  });
  const customers = custRes?.rows || custRes || [];

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: (dto: any) => helpdeskApi.createTicket(orgId, dto),
    onSuccess: () => {
      toast.success("Support ticket created!");
      setNewTicketOpen(false);
      queryClient.invalidateQueries({ queryKey: ["helpdesk_tickets", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create ticket"),
  });

  const resolveTicketMutation = useMutation({
    mutationFn: (id: string) => helpdeskApi.resolveTicket(orgId, id),
    onSuccess: () => {
      toast.success("Ticket resolved!");
      queryClient.invalidateQueries({ queryKey: ["helpdesk_tickets", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to resolve ticket"),
  });

  // State for form
  const [subject, setSubject] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [descriptionText, setDescriptionText] = useState("");

  const openTickets = tickets.filter((t: any) => t.status !== "RESOLVED" && t.status !== "CLOSED");
  const urgentTickets = tickets.filter((t: any) => t.priority === "URGENT" || t.priority === "HIGH");

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Helpdesk &amp; Support Tickets
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage customer support inquiries, SLA deadlines, ticket assignments, and automated resolution.
              </p>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setNewTicketOpen(true)}
          className="bg-[#008080] hover:bg-[#006666] text-white gap-1.5 shadow-sm text-xs h-9 font-medium"
        >
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Total Tickets</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{tickets.length}</div>
          <span className="text-[11px] text-gray-400 mt-1">All time inquiries</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Open Tickets</span>
          <div className="text-xl font-bold text-blue-600 mt-1">{openTickets.length}</div>
          <span className="text-[11px] text-blue-600 flex items-center gap-1 mt-1 font-medium">
            <Clock className="h-3 w-3" /> Awaiting resolution
          </span>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Urgent Escalations</span>
          <div className="text-xl font-bold text-red-600 mt-1">{urgentTickets.length}</div>
          <span className="text-[11px] text-red-600 flex items-center gap-1 mt-1 font-medium">
            <ShieldAlert className="h-3 w-3" /> High priority SLA
          </span>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Resolved Rate</span>
          <div className="text-xl font-bold text-green-700 mt-1">
            {tickets.length > 0 ? `${Math.round(((tickets.length - openTickets.length) / tickets.length) * 100)}%` : "100%"}
          </div>
          <span className="text-[11px] text-green-700 flex items-center gap-1 mt-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> SLA target achieved
          </span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by subject, ticket number..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex gap-1.5">
          {["all", "NEW", "IN_PROGRESS", "RESOLVED"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className={`text-xs capitalize h-9 ${
                statusFilter === st
                  ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold hover:bg-blue-100"
                  : "text-gray-600"
              }`}
            >
              {st.toLowerCase().replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Tickets Table ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <LifeBuoy className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-800">No Support Tickets Found</p>
            <p className="text-xs text-gray-500 mt-1">Open support tickets will appear here with automated SLA tracking.</p>
            <Button size="sm" onClick={() => setNewTicketOpen(true)} className="mt-4 bg-[#008080] hover:bg-[#006666] text-white text-xs">
              Create First Ticket
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="border-b border-[#E5EAF1]">
                <TableHead className="text-gray-500">Ticket #</TableHead>
                <TableHead className="text-gray-500">Subject</TableHead>
                <TableHead className="text-gray-500">Customer</TableHead>
                <TableHead className="text-gray-500">Priority</TableHead>
                <TableHead className="text-gray-500">Status</TableHead>
                <TableHead className="text-gray-500">SLA Target</TableHead>
                <TableHead className="text-right text-gray-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E5EAF1]">
              {tickets.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber}</TableCell>
                  <TableCell className="text-xs font-medium text-gray-900 max-w-xs truncate">{t.subject}</TableCell>
                  <TableCell className="text-xs text-gray-600">{t.customer?.name || "Anonymous"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        t.priority === "URGENT"
                          ? "border-red-200 text-red-700 bg-red-50"
                          : t.priority === "HIGH"
                          ? "border-amber-200 text-amber-700 bg-amber-50"
                          : "border-gray-200 text-gray-600 bg-gray-50"
                      }`}
                    >
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        t.status === "RESOLVED"
                          ? "border-green-200 text-green-700 bg-green-50"
                          : "border-blue-200 text-blue-700 bg-blue-50"
                      }`}
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{t.slaHours}h SLA</TableCell>
                  <TableCell className="text-right">
                    {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveTicketMutation.mutate(t.id)}
                        disabled={resolveTicketMutation.isPending}
                        className="h-7 text-[11px] border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Resolved
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Dialog: Create Ticket ───────────────────────────────────────────── */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open Helpdesk Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Ticket Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Integration webhook endpoint 500 error"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-gray-700">Customer</Label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company || "Client"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Priority Level</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Issue Description</Label>
              <Input
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Detailed steps or problem description"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!subject || !descriptionText) {
                  toast.error("Please provide subject and description.");
                  return;
                }
                createTicketMutation.mutate({
                  subject,
                  description: descriptionText,
                  customerId: customerId || undefined,
                  priority,
                });
              }}
              disabled={createTicketMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
