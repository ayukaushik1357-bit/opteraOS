import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/components/app/AppShell";
import { listInvoices, saveInvoice, setInvoiceStatus, deleteInvoice } from "@/lib/crm.functions";
import { money, shortDate } from "@/lib/format";

const title = "Invoices — opteraOS";
const description = "Issue invoices, track paid and overdue balances, and keep cash flow visible across your workspace.";

export const Route = createFileRoute("/_authenticated/invoices")({
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
  component: InvoicesPage,
});

const STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
type Status = (typeof STATUSES)[number];

type Draft = {
  id?: string;
  number: string;
  amount: string;
  status: Status;
  customerId: string;
  issueDate: string;
  dueDate: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function InvoicesPage() {
  const { current } = useWorkspace();
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();
  const fetchInvoices = useServerFn(listInvoices);
  const save = useServerFn(saveInvoice);
  const setStatus = useServerFn(setInvoiceStatus);
  const remove = useServerFn(deleteInvoice);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    number: "",
    amount: "",
    status: "draft",
    customerId: "",
    issueDate: today(),
    dueDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", current?.id],
    queryFn: () => fetchInvoices({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", current?.id] });
  };

  const invoices = data?.invoices ?? [];
  const customers = data?.customers ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          orgId: current!.id,
          number: draft.number,
          amount: Number(draft.amount || 0),
          status: draft.status,
          customerId: draft.customerId,
          issueDate: draft.issueDate,
          dueDate: draft.dueDate,
        },
      }),
    onSuccess: () => {
      toast.success(draft.id ? "Invoice updated" : "Invoice created");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: Status }) => setStatus({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Invoice deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setDraft({
      number: `INV-${String(invoices.length + 1).padStart(4, "0")}`,
      amount: "",
      status: "draft",
      customerId: "",
      issueDate: today(),
      dueDate: "",
    });
    setOpen(true);
  }

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount ?? 0), 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {money(collected, currency)} collected · {money(outstanding, currency)} outstanding
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-primary-foreground" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> New invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit invoice" : "New invoice"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="i-number">Number</Label>
                  <Input id="i-number" value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="i-amount">Amount ({currency})</Label>
                  <Input id="i-amount" type="number" min={0} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="i-issue">Issue date</Label>
                  <Input id="i-issue" type="date" value={draft.issueDate} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="i-due">Due date</Label>
                  <Input id="i-due" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Customer</Label>
                <Select value={draft.customerId || "none"} onValueChange={(v) => setDraft({ ...draft, customerId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-gradient-brand text-primary-foreground"
                disabled={!draft.number.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="grid gap-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : invoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No invoices yet — create your first one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.number}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customers.find((c) => c.id === inv.customer_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell>{money(Number(inv.amount ?? 0), currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(inv.issue_date)}</TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(inv.due_date)}</TableCell>
                  <TableCell>
                    <Select value={inv.status} onValueChange={(v) => statusMutation.mutate({ id: inv.id, status: v as Status })}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDraft({
                          id: inv.id,
                          number: inv.number,
                          amount: String(inv.amount ?? 0),
                          status: inv.status as Status,
                          customerId: inv.customer_id ?? "",
                          issueDate: inv.issue_date,
                          dueDate: inv.due_date ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(inv.id)} aria-label={`Delete ${inv.number}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}