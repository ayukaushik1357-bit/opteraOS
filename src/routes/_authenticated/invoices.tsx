import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Download, CreditCard, Loader2, X } from "lucide-react";
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
import { CheckCircle2 } from "lucide-react";
import { useWorkspace } from "@/components/app/AppShell";
import { listInvoices, saveInvoice, setInvoiceStatus, deleteInvoice } from "@/lib/crm.functions";
import { downloadInvoicePdf } from "@/lib/pdf-generator";
import { money, shortDate } from "@/lib/format";

const title = "Invoices — opteraOS";
const description =
  "Issue invoices, track paid and overdue balances, and keep cash flow visible across your workspace.";

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

type LineItem = { description: string; quantity: number; unit_price: number };

type Draft = {
  id?: string;
  number: string;
  amount: string;
  status: Status;
  customerId: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  taxRate: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(invoiceCount: number): Draft {
  return {
    number: `INV-${String(invoiceCount + 1).padStart(4, "0")}`,
    amount: "",
    status: "draft",
    customerId: "",
    issueDate: today(),
    dueDate: "",
    lineItems: [{ description: "", quantity: 1, unit_price: 0 }],
    taxRate: "0",
  };
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border border-rose-200",
  sent: "bg-[rgba(0,128,128,0.08)] text-[#008080] border border-[rgba(0,128,128,0.2)]",
  draft: "bg-[#EDF4F3] text-[#3D5A58] border border-[rgba(0,128,128,0.15)]",
  void: "bg-[#EDF4F3] text-[#617D7B] border border-[rgba(0,128,128,0.1)]",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-[#EDF4F3] text-[#3D5A58]"}`}
    >
      {status}
    </span>
  );
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
  const [draft, setDraft] = useState<Draft>(emptyDraft(0));
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

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
  const org = data?.org ?? null;

  const saveMutation = useMutation({
    mutationFn: () => {
      // Compute amount from line items
      const subtotal = draft.lineItems.reduce(
        (s, i) => s + (i.quantity || 0) * (i.unit_price || 0),
        0,
      );
      const tax = subtotal * ((Number(draft.taxRate) || 0) / 100);
      const total = subtotal + tax;

      return save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          orgId: current!.id,
          number: draft.number,
          amount: total || Number(draft.amount || 0),
          status: draft.status,
          customerId: draft.customerId,
          issueDate: draft.issueDate,
          dueDate: draft.dueDate,
          lineItems:
            draft.lineItems.filter((i) => i.description.trim() && i.quantity > 0).length > 0
              ? draft.lineItems.filter((i) => i.description.trim())
              : undefined,
          taxRate: Number(draft.taxRate) || 0,
        },
      });
    },
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
    setDraft(emptyDraft(invoices.length));
    setOpen(true);
  }

  function openEdit(inv: (typeof invoices)[number]) {
    const rawItems = (inv as any).line_items as LineItem[] | null;
    setDraft({
      id: inv.id,
      number: inv.number,
      amount: String(inv.amount ?? 0),
      status: inv.status as Status,
      customerId: inv.customer_id ?? "",
      issueDate: inv.issue_date,
      dueDate: inv.due_date ?? "",
      lineItems:
        rawItems && rawItems.length > 0
          ? rawItems
          : [{ description: "", quantity: 1, unit_price: Number(inv.amount ?? 0) }],
      taxRate: String((inv as any).tax_rate ?? 0),
    });
    setOpen(true);
  }

  // ── Line item helpers ────────────────────────────────────────────────────────
  function updateLineItem(idx: number, field: keyof LineItem, value: string | number) {
    const updated = draft.lineItems.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    setDraft({ ...draft, lineItems: updated });
  }

  function addLineItem() {
    setDraft({
      ...draft,
      lineItems: [...draft.lineItems, { description: "", quantity: 1, unit_price: 0 }],
    });
  }

  function removeLineItem(idx: number) {
    if (draft.lineItems.length === 1) return;
    setDraft({ ...draft, lineItems: draft.lineItems.filter((_, i) => i !== idx) });
  }

  const draftSubtotal = draft.lineItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0,
  );
  const draftTax = draftSubtotal * ((Number(draft.taxRate) || 0) / 100);
  const draftTotal = draftSubtotal + draftTax;

  // ── Mark Paid Action ────────────────────────────────────────────────────────
  async function handleMarkPaid(inv: (typeof invoices)[number]) {
    if (!current) return;
    setPayingInvoiceId(inv.id);
    try {
      await setStatus({
        data: { orgId: current.id, id: inv.id, invoiceId: inv.id, status: "paid" },
      });
      toast.success(`Invoice #${inv.number} marked as Paid.`);
      invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark invoice as paid.");
    } finally {
      setPayingInvoiceId(null);
    }
  }

  // ── PDF Download ────────────────────────────────────────────────────────────
  function handleDownloadPdf(inv: (typeof invoices)[number]) {
    const customerInfo = customers.find((c) => c.id === inv.customer_id);
    const rawItems = (inv as any).line_items as LineItem[] | null;
    const hasItems = rawItems && rawItems.length > 0;

    downloadInvoicePdf({
      invoice_number: inv.number,
      created_at: inv.issue_date,
      due_date: inv.due_date ?? null,
      amount: Number(inv.amount ?? 0),
      tax_rate: (inv as any).tax_rate ?? 0,
      status: inv.status,
      // Conditional spread avoids passing `undefined` for optional properties
      // (required by exactOptionalPropertyTypes: true)
      ...(hasItems ? { items: rawItems as LineItem[] } : {}),
      ...(customerInfo
        ? {
            customer: {
              name: customerInfo.name,
              email: customerInfo.email ?? null,
              ...(customerInfo.phone != null ? { phone: customerInfo.phone } : {}),
              ...(customerInfo.company != null ? { company: customerInfo.company } : {}),
            },
          }
        : {}),
      org: org
        ? {
            name: org.name,
            currency: org.currency || currency,
          }
        : { name: current?.name || "opteraOS Workspace", currency },
    });
  }

  // ── Computed stats ────────────────────────────────────────────────────────────
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const collected = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amount ?? 0), 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F2423]">Invoices</h1>
          <p className="mt-1 text-sm text-[#617D7B]">
            <span className="font-semibold text-[#008080]">{money(collected, currency)}</span> collected &bull; <span className="font-semibold text-amber-600">{money(outstanding, currency)}</span> outstanding
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#008080] hover:bg-[#006666] text-white shadow-teal-sm font-semibold" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> New invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[rgba(0,128,128,0.2)] shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#0F2423] font-bold text-lg">{draft.id ? "Edit invoice" : "New invoice"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Invoice Number + Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="i-number" className="text-xs font-semibold text-[#0F2423]">Invoice Number</Label>
                  <Input
                    id="i-number"
                    value={draft.number}
                    onChange={(e) => setDraft({ ...draft, number: e.target.value })}
                    className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[#0F2423]">Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft({ ...draft, status: v as Status })}
                  >
                    <SelectTrigger className="border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="i-issue" className="text-xs font-semibold text-[#0F2423]">Issue date</Label>
                  <Input
                    id="i-issue"
                    type="date"
                    value={draft.issueDate}
                    onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })}
                    className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="i-due" className="text-xs font-semibold text-[#0F2423]">Due date</Label>
                  <Input
                    id="i-due"
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                    className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>
              </div>

              {/* Customer + Tax Rate */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[#0F2423]">Customer</Label>
                  <Select
                    value={draft.customerId || "none"}
                    onValueChange={(v) =>
                      setDraft({ ...draft, customerId: v === "none" ? "" : v })
                    }
                  >
                    <SelectTrigger className="border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="i-tax" className="text-xs font-semibold text-[#0F2423]">Tax rate (%)</Label>
                  <Input
                    id="i-tax"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="e.g. 18 for 18% GST"
                    value={draft.taxRate}
                    onChange={(e) => setDraft({ ...draft, taxRate: e.target.value })}
                    className="border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold text-[#0F2423]">Line Items</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addLineItem} className="text-[#008080] hover:bg-[rgba(0,128,128,0.08)] text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                  </Button>
                </div>
                <div className="grid gap-2">
                  {draft.lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Description"
                        className="flex-1 border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0.001}
                        step={1}
                        placeholder="Qty"
                        className="w-20 border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unit price"
                        className="w-28 border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(idx, "unit_price", Number(e.target.value))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={draft.lineItems.length === 1}
                        onClick={() => removeLineItem(idx)}
                        aria-label="Remove item"
                        className="text-[#617D7B] hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals preview */}
              <div className="rounded-xl bg-[#EDF4F3]/60 border border-[rgba(0,128,128,0.15)] p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#617D7B]">Subtotal</span>
                  <span className="font-semibold text-[#0F2423]">{money(draftSubtotal, currency)}</span>
                </div>
                {draftTax > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-[#617D7B]">Tax ({draft.taxRate}%)</span>
                    <span className="font-semibold text-[#0F2423]">{money(draftTax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-2 border-t border-[rgba(0,128,128,0.15)] pt-2 font-bold text-[#0F2423]">
                  <span>Total</span>
                  <span className="text-[#008080] font-bold text-base">{money(draftTotal, currency)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-[#008080] hover:bg-[#006666] text-white shadow-teal-sm font-semibold"
                disabled={!draft.number.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save invoice"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-[rgba(0,128,128,0.14)] bg-white shadow-teal-xs overflow-hidden">
        {isLoading ? (
          <div className="grid gap-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No invoices yet — create your first one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[rgba(0,128,128,0.03)] border-b border-[rgba(0,128,128,0.1)] hover:bg-transparent">
                <TableHead className="text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Number</TableHead>
                <TableHead className="text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Customer</TableHead>
                <TableHead className="text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Amount</TableHead>
                <TableHead className="text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Issued</TableHead>
                <TableHead className="text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Due</TableHead>
                <TableHead className="text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-40 text-right text-[#617D7B] font-semibold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[rgba(0,128,128,0.08)]">
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-[rgba(0,128,128,0.02)] border-b border-[rgba(0,128,128,0.08)] transition-colors">
                  <TableCell className="font-semibold text-[#0F2423] font-mono">{inv.number}</TableCell>
                  <TableCell className="text-[#3D5A58] font-medium">
                    {customers.find((c) => c.id === inv.customer_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="font-bold text-[#0F2423] tabular-nums">{money(Number(inv.amount ?? 0), currency)}</TableCell>
                  <TableCell className="text-[#617D7B]">
                    {shortDate(inv.issue_date)}
                  </TableCell>
                  <TableCell className="text-[#617D7B]">
                    {inv.due_date ? shortDate(inv.due_date) : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={inv.status}
                      onValueChange={(v) =>
                        statusMutation.mutate({ id: inv.id, status: v as Status })
                      }
                    >
                      <SelectTrigger className="h-8 w-28 text-xs border-[rgba(0,128,128,0.2)] text-[#0F2423]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Mark Paid — for unpaid invoices */}
                      {inv.status !== "paid" && inv.status !== "void" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={payingInvoiceId === inv.id}
                          onClick={() => handleMarkPaid(inv)}
                          title="Mark as Paid"
                          aria-label={`Mark invoice ${inv.number} as paid`}
                          className="hover:bg-emerald-50"
                        >
                          {payingInvoiceId === inv.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                        </Button>
                      )}
                      {/* Download PDF */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPdf(inv)}
                        title="Download PDF"
                        aria-label={`Download PDF for ${inv.number}`}
                        className="text-[#008080] hover:bg-[rgba(0,128,128,0.08)]"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(inv)}
                        className="text-[#3D5A58] hover:text-[#008080] hover:bg-[rgba(0,128,128,0.06)]"
                      >
                        Edit
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(inv.id)}
                        aria-label={`Delete ${inv.number}`}
                        className="text-[#617D7B] hover:text-red-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}
