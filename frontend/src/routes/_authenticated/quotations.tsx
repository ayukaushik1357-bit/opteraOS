import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Search, RefreshCw, CheckCircle2, XCircle, Send,
  Download, Eye, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { quotationsApi, customersApi, dealsApi } from "@/lib/api";
import { useWorkspace } from "@/components/app/AppShell";
import { money, shortDate } from "@/lib/format";
import { appHead } from "@/lib/app-head";
import { PageHeader, EmptyState, Pager } from "@/components/shared/ui-kit";
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

export const Route = createFileRoute("/_authenticated/quotations")({
  head: appHead("Sales Quotations", "Generate vector PDF quotations, discount approvals, email delivery, and customer acceptance."),
  component: QuotationsPage,
});

export function QuotationsPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sendEmailModalQuote, setSendEmailModalQuote] = useState<any | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const [newQuote, setNewQuote] = useState({
    customerId: "",
    opportunityId: "",
    paymentTerms: "Net 30",
    discountAmount: 0,
    terms: "1. Quotation valid for 30 days. 2. Standard payment terms apply. 3. GST calculated at 18%.",
    items: [
      { description: "Enterprise Platform License (Annual)", quantity: 1, unitPrice: 200000, discountPercent: 0, taxRate: 18 },
      { description: "Implementation & Training Pack", quantity: 1, unitPrice: 50000, discountPercent: 0, taxRate: 18 },
    ],
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["quotations", orgId, page, statusFilter],
    queryFn: () =>
      quotationsApi.list(orgId, {
        page,
        pageSize: 15,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      }),
    enabled: !!orgId,
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => customersApi.list(orgId, { pageSize: 100 }),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => quotationsApi.create(orgId, newQuote),
    onSuccess: (res: any) => {
      toast.success(`Quotation ${res?.quotationNumber || ''} created`);
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_summary", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create quotation"),
  });

  const sendEmailMutation = useMutation({
    mutationFn: () =>
      quotationsApi.sendEmail(orgId, sendEmailModalQuote.id, {
        to: emailTo,
        subject: emailSubject,
        message: emailMessage,
      }),
    onSuccess: () => {
      toast.success("Quotation PDF sent to customer via email!");
      setSendEmailModalQuote(null);
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to dispatch email"),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.accept(orgId, id, { acceptedBy: "Customer Representative" }),
    onSuccess: (res: any) => {
      toast.success(`Quotation accepted! Generated Sales Order ${res?.order?.orderNumber || ''}`);
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId] });
      queryClient.invalidateQueries({ queryKey: ["orders", orgId] });
      queryClient.invalidateQueries({ queryKey: ["crm_summary", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to accept quotation"),
  });

  const approveDiscountMutation = useMutation({
    mutationFn: (id: string) => quotationsApi.approveDiscount(orgId, id),
    onSuccess: () => {
      toast.success("Quotation discount approved by manager");
      queryClient.invalidateQueries({ queryKey: ["quotations", orgId] });
    },
  });

  const rows = data?.rows || [];
  const pages = data?.pages || 1;

  const calculateSubtotal = () => {
    return newQuote.items.reduce((sum, item) => {
      const line = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      return sum + line;
    }, 0);
  };

  const calculateTax = () => {
    return newQuote.items.reduce((sum, item) => {
      const line = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      return sum + (line * (item.taxRate || 0)) / 100;
    }, 0);
  };

  const calculateTotal = () => {
    return Math.max(calculateSubtotal() + calculateTax() - (newQuote.discountAmount || 0), 0);
  };

  const getStatusBadge = (status: string, approvalStatus?: string) => {
    if (approvalStatus === "PENDING") {
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 gap-1"><AlertTriangle className="w-3 h-3" /> Approval Needed</Badge>;
    }
    switch (status) {
      case "ACCEPTED":
        return <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Accepted</Badge>;
      case "SENT":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 gap-1"><Send className="w-3 h-3" /> Sent</Badge>;
      case "DRAFT":
        return <Badge className="bg-gray-100 text-gray-700 border border-gray-200 gap-1">Draft</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border border-gray-200 gap-1">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Quotations"
        subtitle="Formal sales quotations with real-time tax calculation, discount threshold approvals, PDF export, and customer acceptance."
        actions={
          <Button
            className="bg-[#008080] hover:bg-[#006666] text-white shadow-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create Quotation
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-white border-[#E5EAF1]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Quotations Table */}
      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No quotations found"
          description="Create your first quotation with automatic PDF generation and approval checks."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-[#E5EAF1]">
              <tr>
                <th className="px-4 py-3.5">Quotation #</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Salesperson</th>
                <th className="px-4 py-3.5">Total Amount</th>
                <th className="px-4 py-3.5">Generated Order</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {rows.map((quote: any) => (
                <tr key={quote.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3.5 font-bold text-gray-900 font-mono">
                    {quote.quotationNumber}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-900">{quote.customer?.name || quote.company?.displayName || 'Direct Customer'}</p>
                    <p className="text-xs text-gray-500">{quote.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {getStatusBadge(quote.status, quote.approvalStatus)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {quote.salesperson ? `${quote.salesperson.firstName} ${quote.salesperson.lastName}` : 'Direct'}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums font-bold text-foreground">
                    {money(Number(quote.total || 0), quote.currency || currency)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono">
                    {quote.order ? (
                      <span className="font-semibold text-emerald-600">
                        {quote.order.orderNumber}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* PDF download */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        asChild
                      >
                        <a href={quotationsApi.getPdfUrl(orgId, quote.id)} target="_blank" rel="noopener noreferrer" title="Download Vector PDF">
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </a>
                      </Button>

                      {/* Email Send */}
                      {quote.status !== "ACCEPTED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setSendEmailModalQuote(quote);
                            setEmailTo(quote.customer?.email || "");
                            setEmailSubject(`Quotation ${quote.quotationNumber} from opteraOS`);
                            setEmailMessage(`Dear Customer,\n\nPlease review attached quotation ${quote.quotationNumber}.\n\nTotal: ${money(Number(quote.total), quote.currency || currency)}`);
                          }}
                          title="Send PDF Email"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Send
                        </Button>
                      )}

                      {/* Approve Discount */}
                      {quote.approvalStatus === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => approveDiscountMutation.mutate(quote.id)}
                        >
                          <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                      )}

                      {/* Accept Quotation */}
                      {quote.status !== "ACCEPTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => acceptMutation.mutate(quote.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pages={pages} onPage={setPage} />

      {/* Create Quotation Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Sales Quotation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Customer Account *</Label>
                <Select
                  value={newQuote.customerId}
                  onValueChange={(v) => setNewQuote({ ...newQuote, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
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
                <Label>Payment Terms</Label>
                <Input
                  value={newQuote.paymentTerms}
                  onChange={(e) => setNewQuote({ ...newQuote, paymentTerms: e.target.value })}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setNewQuote({
                      ...newQuote,
                      items: [
                        ...newQuote.items,
                        { description: "New Item", quantity: 1, unitPrice: 10000, discountPercent: 0, taxRate: 18 },
                      ],
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-2">
                {newQuote.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-border bg-muted/20">
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...newQuote.items];
                          if (items[idx]) items[idx] = { ...items[idx], description: e.target.value };
                          setNewQuote({ ...newQuote, items });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...newQuote.items];
                          if (items[idx]) items[idx] = { ...items[idx], quantity: Number(e.target.value) };
                          setNewQuote({ ...newQuote, items });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const items = [...newQuote.items];
                          if (items[idx]) items[idx] = { ...items[idx], unitPrice: Number(e.target.value) };
                          setNewQuote({ ...newQuote, items });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Disc %"
                        value={item.discountPercent}
                        onChange={(e) => {
                          const items = [...newQuote.items];
                          if (items[idx]) items[idx] = { ...items[idx], discountPercent: Number(e.target.value) };
                          setNewQuote({ ...newQuote, items });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => {
                          if (newQuote.items.length > 1) {
                            setNewQuote({ ...newQuote, items: newQuote.items.filter((_, i) => i !== idx) });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-semibold text-foreground">{money(calculateSubtotal(), currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Taxes (GST 18%):</span>
                <span className="font-semibold text-foreground">{money(calculateTax(), currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-brand-indigo pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span>{money(calculateTotal(), currency)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
              disabled={!newQuote.customerId || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Generate Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={!!sendEmailModalQuote} onOpenChange={() => setSendEmailModalQuote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Quotation PDF</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Message</Label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-2 text-xs"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailModalQuote(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[#008080] hover:bg-[#006666] text-white"
              disabled={!emailTo || sendEmailMutation.isPending}
              onClick={() => sendEmailMutation.mutate()}
            >
              Dispatch PDF Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
