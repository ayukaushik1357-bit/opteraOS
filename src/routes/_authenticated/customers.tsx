import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
  Sparkles,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { assignAndExecuteCustomerTask } from "@/lib/tasks.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/components/app/AppShell";
import {
  listCustomersPaginated,
  saveCustomer,
  deleteCustomer,
  bulkImportCustomers,
  createCustomerRegToken,
  listCustomerRegTokens,
  revokeCustomerRegToken,
} from "@/lib/crm.functions";
import { shortDate } from "@/lib/format";

const title = "Customers — opteraOS";
const description =
  "Manage every customer relationship, contact detail and account status inside your opteraOS CRM.";

export const Route = createFileRoute("/_authenticated/customers")({
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
  component: CustomersPage,
});

type Status = "active" | "prospect" | "churned";

const STATUS_COLORS: Record<Status, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
  churned: "bg-red-50 text-red-700 border-red-200",
};

// ─── Parse CSV rows from a file ─────────────────────────────────────────────
function parseCsvFile(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2 || !lines[0]) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

// Normalise a CSV row to our schema fields
function normaliseCsvRow(raw: Record<string, string>): Record<string, unknown> {
  const find = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k] ?? raw[k.replace(/_/g, " ")] ?? raw[k.replace(/ /g, "_")] ?? "";
      if (v) return v;
    }
    return "";
  };
  return {
    name: find("name", "full_name", "fullname", "customer_name", "contact_name"),
    company: find("company", "company_name", "organisation", "organization"),
    email: find("email", "email_address"),
    phone: find("phone", "phone_number", "mobile", "tel"),
    status: find("status") || "prospect",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

function CustomersPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();

  // Server functions
  const fetchCustomers = useServerFn(listCustomersPaginated);
  const save = useServerFn(saveCustomer);
  const remove = useServerFn(deleteCustomer);
  const bulkImport = useServerFn(bulkImportCustomers);
  const createToken = useServerFn(createCustomerRegToken);
  const fetchTokens = useServerFn(listCustomerRegTokens);
  const revokeToken = useServerFn(revokeCustomerRegToken);
  const assignAndExecute = useServerFn(assignAndExecuteCustomerTask);

  // ── List state ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "name" | "company">("created_at");

  // ── Task Assignment Modal State ───────────────────────────────────────────
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskCustomer, setTaskCustomer] = useState<{ id: string; name: string; company?: string | null; email?: string | null; phone?: string | null; status?: string } | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskWorkType, setTaskWorkType] = useState<string>("customer_follow_up");
  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAutoExecute, setTaskAutoExecute] = useState(true);
  const [taskActionPreset, setTaskActionPreset] = useState("follow_up");

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers", current?.id, page, debouncedSearch, statusFilter, sortBy],
    queryFn: () =>
      fetchCustomers({
        data: {
          orgId: current!.id,
          page,
          pageSize: 50,
          search: debouncedSearch || undefined,
          status: statusFilter,
          sortBy,
          sortDir: "desc",
        },
      }),
    enabled: !!current,
    // Keep previous data while fetching so table doesn't flash empty
    placeholderData: (prev) => prev,
  });

  // ── Add / Edit Customer ───────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{
    id?: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    status: Status;
  }>({ name: "", company: "", email: "", phone: "", status: "prospect" });

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["customers", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["crm_summary", current?.id] });
  }, [queryClient, current?.id]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { ...editing, orgId: current!.id } }),
    onSuccess: () => {
      toast.success(editing.id ? "Customer updated" : "Customer added");
      setFormOpen(false);
      setEditing({ name: "", company: "", email: "", phone: "", status: "prospect" });
      invalidateList();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Customer deleted"); invalidateList(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignTaskMutation = useMutation({
    mutationFn: () => {
      if (!taskCustomer) throw new Error("No customer selected");
      return assignAndExecute({
        data: {
          orgId: current!.id,
          customerId: taskCustomer.id,
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          workType: taskWorkType as any,
          dueDate: taskDueDate || undefined,
          autoExecute: taskAutoExecute,
          actionPreset: taskActionPreset,
        },
      });
    },
    onSuccess: (res: any) => {
      if (res?.isBlocked) {
        toast.warning(`Autopilot: Action blocked (${res.execution?.blockedReason || "integration unavailable"})`);
      } else if (res?.execution?.status === "successful") {
        toast.success(`Autopilot executed ${res.execution.actionExecuted} for ${res.customerName}!`);
      } else {
        toast.success(`Task assigned to ${taskCustomer?.name}`);
      }
      setTaskModalOpen(false);
      invalidateList();
      queryClient.invalidateQueries({ queryKey: ["tasks", current?.id] });
      queryClient.invalidateQueries({ queryKey: ["autopilot_dashboard", current?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to execute customer task"),
  });

  function openAssignTask(customer: any, preset: string = "follow_up") {
    setTaskCustomer(customer);
    setTaskActionPreset(preset);
    setTaskAutoExecute(true);
    setTaskDueDate(new Date().toISOString().substring(0, 10));

    if (preset === "follow_up") {
      setTaskTitle(`Follow up with ${customer.name}`);
      setTaskDescription(`Engage ${customer.name} to check satisfaction, present upgrades, and strengthen relationship.`);
      setTaskWorkType("customer_follow_up");
    } else if (preset === "retention") {
      setTaskTitle(`Retention & Health Analysis for ${customer.name}`);
      setTaskDescription(`Evaluate account engagement, past revenue, and churn risk factors with AI recommendations.`);
      setTaskWorkType("ai_action");
    } else if (preset === "payment_recovery") {
      setTaskTitle(`Payment Follow-up for ${customer.name}`);
      setTaskDescription(`Review outstanding balances and send polite reminder communication.`);
      setTaskWorkType("invoice_follow_up");
    } else {
      setTaskTitle(`Task for ${customer.name}`);
      setTaskDescription("");
      setTaskWorkType("task");
    }
    setTaskModalOpen(true);
  }

  function openNew() {
    setEditing({ name: "", company: "", email: "", phone: "", status: "prospect" });
    setFormOpen(true);
  }

  // ── Bulk Import ────────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "result">("upload");
  const [importResult, setImportResult] = useState<{
    total: number; imported: number; duplicates: number; validationErrors: number;
    insertErrors: number; errorDetails: Array<{ row: number; reason: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File) {
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsvFile(text);
      setImportRows(parsed);
      setImportStep("preview");
    };
    reader.readAsText(file);
  }

  const importMutation = useMutation({
    mutationFn: () =>
      bulkImport({
        data: {
          orgId: current!.id,
          rows: importRows.map(normaliseCsvRow),
        },
      }),
    onSuccess: (result) => {
      setImportResult(result);
      setImportStep("result");
      invalidateList();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetImport() {
    setImportFile(null);
    setImportRows([]);
    setImportStep("upload");
    setImportResult(null);
    setImportOpen(false);
  }

  // ── Customer Registration Link ─────────────────────────────────────────────
  const [linkOpen, setLinkOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: tokens, isLoading: loadingTokens } = useQuery({
    queryKey: ["customer_reg_tokens", current?.id],
    queryFn: () => fetchTokens({ data: { orgId: current!.id } }),
    enabled: !!current && linkOpen,
    staleTime: 30_000,
  });

  const createTokenMutation = useMutation({
    mutationFn: () => createToken({ data: { orgId: current!.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_reg_tokens", current?.id] });
      toast.success("Registration link created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeTokenMutation = useMutation({
    mutationFn: (id: string) => revokeToken({ data: { tokenId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_reg_tokens", current?.id] });
      toast.success("Link deactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Link copied to clipboard");
    });
  }

  const canManage = current?.role === "owner" || current?.role === "admin";

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.total != null
              ? `${data.total.toLocaleString()} customer${data.total !== 1 ? "s" : ""} in ${current?.name ?? "your workspace"}`
              : "Your CRM records, shared across the workspace."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import */}
          <Dialog open={importOpen} onOpenChange={(v) => { if (!v) resetImport(); else setImportOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1.5 border-[#E5EAF1] text-gray-700 hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Customers from CSV</DialogTitle>
              </DialogHeader>

              {importStep === "upload" && (
                <div className="grid gap-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV with columns: <span className="font-mono text-xs bg-secondary/60 px-1 rounded">name, company, email, phone, status</span>.
                    The <strong>name</strong> column is required. Status defaults to "prospect".
                  </p>
                  <div
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-10 cursor-pointer hover:border-indigo-500/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) handleFileSelect(f);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop your CSV here or <span className="text-indigo-400 underline">browse</span>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Supports up to 50,000 rows. Large imports are processed in batches server-side.</p>
                </div>
              )}

              {importStep === "preview" && (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{importFile?.name}</p>
                      <p className="text-sm text-muted-foreground">{importRows.length.toLocaleString()} rows detected</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setImportStep("upload")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Preview table */}
                  <div className="max-h-64 overflow-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(importRows[0] ?? {}).slice(0, 6).map((h) => (
                            <TableHead key={h} className="text-xs">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importRows.slice(0, 8).map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).slice(0, 6).map((v, j) => (
                              <TableCell key={j} className="text-xs max-w-[120px] truncate">{v}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importRows.length > 8 && (
                      <p className="p-3 text-xs text-muted-foreground text-center">
                        …and {(importRows.length - 8).toLocaleString()} more rows
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportStep("upload")}>Back</Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={importMutation.isPending}
                      onClick={() => importMutation.mutate()}
                    >
                      {importMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</>
                      ) : (
                        <>Import {importRows.length.toLocaleString()} rows</>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {importStep === "result" && importResult && (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Imported", value: importResult.imported, color: "text-emerald-400" },
                      { label: "Duplicates skipped", value: importResult.duplicates, color: "text-amber-400" },
                      { label: "Validation errors", value: importResult.validationErrors, color: "text-red-400" },
                      { label: "Total rows", value: importResult.total, color: "text-slate-300" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-secondary/30 p-4">
                        <p className={`text-2xl font-semibold ${s.color}`}>{s.value.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {importResult.errorDetails.length > 0 && (
                    <div className="max-h-40 overflow-auto rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                      <p className="mb-2 text-xs font-medium text-destructive">First {importResult.errorDetails.length} errors:</p>
                      {importResult.errorDetails.map((e, i) => (
                        <p key={i} className="text-xs text-muted-foreground">Row {e.row}: {e.reason}</p>
                      ))}
                    </div>
                  )}
                  <DialogFooter>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={resetImport}>
                      <Check className="mr-2 h-4 w-4" /> Done
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Customer Registration Link */}
          {canManage && (
            <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1.5 border-[#E5EAF1] text-gray-700 hover:bg-gray-50">
                  <Link2 className="h-4 w-4" />
                  Registration Link
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Customer Registration Link</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Share this link with customers so they can submit their details directly.{" "}
                  <strong>Customers do not get dashboard access</strong> — they only see a branded form.
                </p>

                {loadingTokens ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                ) : (tokens ?? []).filter((t) => t.is_active).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <Link2 className="mx-auto h-6 w-6 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No active registration links yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {(tokens ?? []).filter((t) => t.is_active).map((t) => {
                      const url = `${window.location.origin}/register/${t.token}`;
                      return (
                        <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            {t.label && <p className="text-xs font-medium truncate">{t.label}</p>}
                            <p className="text-xs text-muted-foreground truncate font-mono">{url}</p>
                            <p className="text-xs text-muted-foreground">
                              Expires {shortDate(t.expires_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyLink(t.token, t.id)}>
                              {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                              onClick={() => revokeTokenMutation.mutate(t.id)}
                              disabled={revokeTokenMutation.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <DialogFooter className="flex-row justify-between">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    disabled={createTokenMutation.isPending}
                    onClick={() => createTokenMutation.mutate()}
                  >
                    {createTokenMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Generate new link
                  </Button>
                  <Button onClick={() => setLinkOpen(false)} variant="ghost">Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Add Customer */}
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit customer" : "New customer"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="c-name">
                    Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="c-name"
                    placeholder="Full name or business name"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-company">Company</Label>
                  <Input
                    id="c-company"
                    placeholder="Company or organisation"
                    value={editing.company}
                    onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="c-email">Email</Label>
                    <Input
                      id="c-email"
                      type="email"
                      placeholder="email@example.com"
                      value={editing.email}
                      onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input
                      id="c-phone"
                      placeholder="+91 98765 43210"
                      value={editing.phone}
                      onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing({ ...editing, status: v as Status })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="churned">Churned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={editing.name.trim().length < 2 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                  ) : "Save customer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters & Search ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search customers"
            id="customer-search"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => { setSortBy(v as typeof sortBy); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Newest first</SelectItem>
            <SelectItem value="name">Name A→Z</SelectItem>
            <SelectItem value="company">Company A→Z</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-9 w-9 p-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {isLoading && !data ? (
          <div className="grid gap-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-destructive">{(error as Error).message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (data?.rows ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {debouncedSearch || statusFilter !== "all"
              ? "No customers match your filters."
              : "No customers yet — add your first one or import a CSV."}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.company ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ?? c.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_COLORS[c.status as Status] ?? ""}`}
                      >
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{shortDate(c.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openAssignTask(c)}
                          className="h-7 gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2"
                        >
                          <Zap className="h-3 w-3 text-cyan-400" />
                          <span>Autopilot</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing({
                              id: c.id,
                              name: c.name,
                              company: c.company ?? "",
                              email: c.email ?? "",
                              phone: c.phone ?? "",
                              status: c.status as Status,
                            });
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(c.id)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Showing {((page - 1) * 50 + 1).toLocaleString()}–
                  {Math.min(page * 50, data.total).toLocaleString()} of{" "}
                  {data.total.toLocaleString()} customers
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[6ch] text-center text-muted-foreground">
                    {page} / {data.pages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Assign Customer Task & Autopilot Execution Modal ────────────── */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span>Assign Task to {taskCustomer?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {taskCustomer && (
            <div className="rounded-xl border border-white/10 bg-secondary/30 p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{taskCustomer.name}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[taskCustomer.status as Status] ?? ""}`}>
                  {taskCustomer.status || "prospect"}
                </span>
              </div>
              <p className="text-muted-foreground">
                {taskCustomer.company ? `${taskCustomer.company} · ` : ""}
                {taskCustomer.email || taskCustomer.phone || "No contact info"}
              </p>
            </div>
          )}

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label>Action Preset</Label>
              <Select
                value={taskActionPreset}
                onValueChange={(val) => {
                  if (taskCustomer) openAssignTask(taskCustomer, val);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">Personalized Customer Follow-up</SelectItem>
                  <SelectItem value="retention">Account Health & Churn Risk Audit</SelectItem>
                  <SelectItem value="payment_recovery">Invoice Payment Recovery Notice</SelectItem>
                  <SelectItem value="custom">Custom Task / Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cust-task-title">Task Title</Label>
              <Input
                id="cust-task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Outreach regarding contract renewal"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cust-task-desc">Instructions & Context</Label>
              <Input
                id="cust-task-desc"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Provide details or guidelines for Autopilot reasoning"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(v) => setTaskPriority(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cust-task-due">Due Date</Label>
                <Input
                  id="cust-task-due"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Execute with Autopilot (Gemini Reasoning)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Queries customer records, reasons via Gemini 1.5 Flash, and creates real execution trace.
                </p>
              </div>
              <Switch checked={taskAutoExecute} onCheckedChange={setTaskAutoExecute} />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-gradient-brand text-primary-foreground"
              disabled={taskTitle.trim().length < 2 || assignTaskMutation.isPending}
              onClick={() => assignTaskMutation.mutate()}
            >
              {assignTaskMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing Autopilot…
                </>
              ) : taskAutoExecute ? (
                <>
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Execute & Save
                </>
              ) : (
                "Save Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
