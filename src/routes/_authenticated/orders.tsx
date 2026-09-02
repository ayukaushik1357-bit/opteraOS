import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, Search, RefreshCw, CheckCircle2, Clock, Truck,
  XCircle, Filter, ArrowRight, User, Calendar, DollarSign, FileText, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ordersApi, customersApi } from '@/lib/api';
import { useWorkspace } from '@/components/app/AppShell';
import { money, shortDate } from '@/lib/format';
import { appHead } from '@/lib/app-head';
import { PageHeader, EmptyState, Pager } from '@/components/shared/ui-kit';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/_authenticated/orders')({
  head: appHead('Sales Orders', 'Confirmed customer sales orders, fulfillment contracts, and sequence numbering.'),
  component: OrdersPage,
});

export function OrdersPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || '';
  const currency = current?.currency || 'INR';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation');

  const [newOrder, setNewOrder] = useState({
    customerId: '',
    paymentTerms: 'Net 30',
    notes: '',
    items: [
      { name: 'Standard Product A', description: 'Enterprise License', quantity: 1, unitPrice: 120000, taxRate: 18, discountPercent: 0 },
    ],
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', orgId, page, statusFilter, search],
    queryFn: () =>
      ordersApi.list(orgId, {
        page,
        pageSize: 15,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
    enabled: !!orgId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', orgId],
    queryFn: () => customersApi.list(orgId, { pageSize: 100 }),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => ordersApi.create(orgId, newOrder),
    onSuccess: () => {
      toast.success('Sales order created');
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['orders', orgId] });
      queryClient.invalidateQueries({ queryKey: ['crm_summary', orgId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create order'),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => ordersApi.confirm(orgId, id),
    onSuccess: (res: any) => {
      toast.success(`Sales Order confirmed! Dispatched fulfillment contract.`);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders', orgId] });
      queryClient.invalidateQueries({ queryKey: ['crm_summary', orgId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to confirm order'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(orgId, cancelModalOrder.id, cancelReason),
    onSuccess: () => {
      toast.info('Sales Order cancelled');
      setCancelModalOrder(null);
      queryClient.invalidateQueries({ queryKey: ['orders', orgId] });
      queryClient.invalidateQueries({ queryKey: ['crm_summary', orgId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to cancel order'),
  });

  const rows = data?.rows || [];
  const pages = data?.pages || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</Badge>;
      case 'SHIPPED':
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 gap-1"><Truck className="w-3 h-3" /> Shipped</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 gap-1"><Clock className="w-3 h-3" /> Processing</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-cyan-50 text-cyan-700 border border-cyan-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-50 text-red-700 border border-red-200 gap-1"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 border border-gray-200 gap-1">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        subtitle="Manage confirmed customer sales orders, fulfillment commitments, and invoice readiness."
        actions={
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create Sales Order
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Input
            placeholder="Search by order number or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs bg-white border-[#E5EAF1]"
          />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-white border-[#E5EAF1]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No sales orders found"
          description="Create your first sales order directly or accept a formal sales quotation."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-[#E5EAF1]">
              <tr>
                <th className="px-4 py-3.5">Order Number</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Quotation Ref</th>
                <th className="px-4 py-3.5">Total Amount</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1]">
              {rows.map((order: any) => (
                <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3.5 font-bold text-gray-900 font-mono">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-900">{order.customer?.name || order.company?.displayName || 'Direct Customer'}</p>
                    <p className="text-xs text-gray-500">{order.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                    {order.quotation?.quotationNumber || '—'}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums font-bold text-foreground">
                    {money(Number(order.total || 0), order.currency || currency)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {shortDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                          onClick={() => confirmMutation.mutate(order.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
                        </Button>
                      )}
                      {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => setCancelModalOrder(order)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
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

      {/* Create Order Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Sales Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3.5 py-2">
            <div className="grid gap-1.5">
              <Label>Customer Account *</Label>
              <Select
                value={newOrder.customerId}
                onValueChange={(v) => setNewOrder({ ...newOrder, customerId: v })}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Product Name</Label>
                <Input
                  value={newOrder.items[0]?.name || ''}
                  onChange={(e) => {
                    const items = [...newOrder.items];
                    if (items[0]) items[0] = { ...items[0], name: e.target.value };
                    setNewOrder({ ...newOrder, items });
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Unit Price ({currency})</Label>
                <Input
                  type="number"
                  value={newOrder.items[0]?.unitPrice || 0}
                  onChange={(e) => {
                    const items = [...newOrder.items];
                    if (items[0]) items[0] = { ...items[0], unitPrice: Number(e.target.value) };
                    setNewOrder({ ...newOrder, items });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={newOrder.items[0]?.quantity || 1}
                  onChange={(e) => {
                    const items = [...newOrder.items];
                    if (items[0]) items[0] = { ...items[0], quantity: Number(e.target.value) };
                    setNewOrder({ ...newOrder, items });
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Payment Terms</Label>
                <Input
                  value={newOrder.paymentTerms}
                  onChange={(e) => setNewOrder({ ...newOrder, paymentTerms: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
              disabled={!newOrder.customerId || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Modal */}
      <Dialog open={!!cancelModalOrder} onOpenChange={() => setCancelModalOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Cancel Sales Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Cancellation Reason</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOrder(null)}>
              Dismiss
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
