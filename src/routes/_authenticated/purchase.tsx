import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Building2,
  FileText,
  PackageCheck,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Search,
  Check,
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
import { purchaseApi, productsApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "Purchasing & Vendor Management — opteraOS";
const description = "Manage suppliers, purchase orders, automated stock inward receipts, and vendor bills.";

export const Route = createFileRoute("/_authenticated/purchase")({
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
  component: PurchaseMasterPage,
});

function PurchaseMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("orders");
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [newBillOpen, setNewBillOpen] = useState(false);

  // Queries
  const { data: ordersRes, isLoading: loadingOrders } = useQuery({
    queryKey: ["purchase_orders", orgId],
    queryFn: () => purchaseApi.getOrders(orgId),
    enabled: !!orgId,
  });
  const orders = ordersRes?.rows || [];

  const { data: vendorsRes, isLoading: loadingVendors } = useQuery({
    queryKey: ["purchase_vendors", orgId],
    queryFn: () => purchaseApi.getVendors(orgId),
    enabled: !!orgId,
  });
  const vendors = vendorsRes?.rows || [];

  const { data: billsRes, isLoading: loadingBills } = useQuery({
    queryKey: ["purchase_bills", orgId],
    queryFn: () => purchaseApi.getBills(orgId),
    enabled: !!orgId,
  });
  const bills = billsRes?.rows || [];

  const { data: productsRes } = useQuery({
    queryKey: ["products_list", orgId],
    queryFn: () => productsApi.list(orgId),
    enabled: !!orgId,
  });
  const products = productsRes?.rows || productsRes || [];

  // Mutations
  const createVendorMutation = useMutation({
    mutationFn: (dto: any) => purchaseApi.createVendor(orgId, dto),
    onSuccess: () => {
      toast.success("Vendor added successfully!");
      setNewVendorOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchase_vendors", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add vendor"),
  });

  const createPoMutation = useMutation({
    mutationFn: (dto: any) => purchaseApi.createOrder(orgId, dto),
    onSuccess: () => {
      toast.success("Purchase Order issued!");
      setNewPoOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create PO"),
  });

  const confirmPoMutation = useMutation({
    mutationFn: (id: string) => purchaseApi.confirmOrder(orgId, id),
    onSuccess: () => {
      toast.success("Purchase Order confirmed & Inward Stock Picking generated!");
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to confirm PO"),
  });

  const receiveStockMutation = useMutation({
    mutationFn: (id: string) => purchaseApi.receiveStock(orgId, id),
    onSuccess: () => {
      toast.success("Stock received and warehouse inventory incremented!");
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", orgId] });
      queryClient.invalidateQueries({ queryKey: ["products_list", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to receive stock"),
  });

  const createBillMutation = useMutation({
    mutationFn: (dto: any) => purchaseApi.createBill(orgId, dto),
    onSuccess: () => {
      toast.success("Vendor Bill posted!");
      setNewBillOpen(false);
      queryClient.invalidateQueries({ queryKey: ["purchase_bills", orgId] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create bill"),
  });

  // State for PO form
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poItemProductId, setPoItemProductId] = useState("");
  const [poItemName, setPoItemName] = useState("");
  const [poItemQty, setPoItemQty] = useState("10");
  const [poItemPrice, setPoItemPrice] = useState("100");

  // State for Vendor form
  const [vName, setVName] = useState("");
  const [vCompany, setVCompany] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vPhone, setVPhone] = useState("");

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Purchase &amp; Vendor Management
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Supplier procurement, purchase orders, automatic inventory receipts, and vendor bills.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewVendorOpen(true)}
            className="text-xs h-9"
          >
            <Building2 className="h-3.5 w-3.5 mr-1.5" /> Add Vendor
          </Button>

          <Button
            size="sm"
            onClick={() => setNewPoOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm text-xs h-9 font-medium"
          >
            <Plus className="h-4 w-4" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F8FAFC] border border-[#E5EAF1] p-1">
          <TabsTrigger value="orders" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <FileText className="h-3.5 w-3.5" /> Purchase Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Building2 className="h-3.5 w-3.5" /> Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="bills" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Receipt className="h-3.5 w-3.5" /> Vendor Bills ({bills.length})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Purchase Orders ──────────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Purchase Orders</h2>
              <span className="text-xs text-gray-500">{orders.length} total orders</span>
            </div>

            {loadingOrders ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Purchase Orders Issued</p>
                <p className="text-xs text-gray-500 mt-1">Issue a purchase order to order components or stock from suppliers.</p>
                <Button size="sm" onClick={() => setNewPoOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Create First PO
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">PO Number</TableHead>
                    <TableHead className="text-gray-500">Vendor</TableHead>
                    <TableHead className="text-gray-500">Date</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-gray-500">Items</TableHead>
                    <TableHead className="text-gray-500">Total</TableHead>
                    <TableHead className="text-right text-gray-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {orders.map((po: any) => (
                    <TableRow key={po.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{po.poNumber}</TableCell>
                      <TableCell className="text-xs text-gray-900 font-medium">{po.vendor?.name || "Supplier"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{shortDate(po.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            po.status === "CONFIRMED"
                              ? "border-blue-200 text-blue-700 bg-blue-50"
                              : po.status === "RECEIVED"
                              ? "border-green-200 text-green-700 bg-green-50"
                              : po.status === "BILLED"
                              ? "border-purple-200 text-purple-700 bg-purple-50"
                              : "border-gray-200 text-gray-600 bg-gray-50"
                          }`}
                        >
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {(po.items || []).map((i: any) => `${i.name} (x${i.quantity})`).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-900 font-semibold">
                        {currency} {Number(po.total).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {po.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmPoMutation.mutate(po.id)}
                              disabled={confirmPoMutation.isPending}
                              className="h-7 text-[11px] border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              Confirm PO
                            </Button>
                          )}

                          {po.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => receiveStockMutation.mutate(po.id)}
                              disabled={receiveStockMutation.isPending}
                              className="h-7 text-[11px] border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            >
                              <PackageCheck className="h-3 w-3 mr-1" /> Receive Stock
                            </Button>
                          )}

                          {po.status === "RECEIVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                createBillMutation.mutate({
                                  vendorId: po.vendorId,
                                  purchaseOrderId: po.id,
                                  total: Number(po.total),
                                });
                              }}
                              disabled={createBillMutation.isPending}
                              className="h-7 text-[11px] border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                            >
                              Create Bill
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 2. Vendors ──────────────────────────────────────────────────────── */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Suppliers &amp; Vendors Directory</h2>
              <Button size="sm" onClick={() => setNewVendorOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Vendor
              </Button>
            </div>

            {loadingVendors ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : vendors.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Vendors Configured</p>
                <p className="text-xs text-gray-500 mt-1">Add suppliers and partners to track purchasing agreements.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Vendor Name</TableHead>
                    <TableHead className="text-gray-500">Company</TableHead>
                    <TableHead className="text-gray-500">Email</TableHead>
                    <TableHead className="text-gray-500">Phone</TableHead>
                    <TableHead className="text-gray-500">Payment Terms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {vendors.map((v: any) => (
                    <TableRow key={v.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-bold text-gray-900">{v.name}</TableCell>
                      <TableCell className="text-xs text-gray-600">{v.company || "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{v.email || "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{v.phone || "—"}</TableCell>
                      <TableCell className="text-xs text-gray-600">{v.paymentTerms || "Net 30"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 3. Vendor Bills ─────────────────────────────────────────────────── */}
        <TabsContent value="bills" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Vendor Bills &amp; Accounts Payable</h2>
              <span className="text-xs text-gray-500">{bills.length} bills</span>
            </div>

            {loadingBills ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : bills.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Vendor Bills</p>
                <p className="text-xs text-gray-500 mt-1">Vendor bills generated from purchase orders will show here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Bill #</TableHead>
                    <TableHead className="text-gray-500">Vendor</TableHead>
                    <TableHead className="text-gray-500">Date</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-right text-gray-500">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {bills.map((b: any) => (
                    <TableRow key={b.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{b.billNumber}</TableCell>
                      <TableCell className="text-xs text-gray-900 font-medium">{b.vendor?.name || "Vendor"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{shortDate(b.billDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-[10px]">
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-gray-900 font-bold">
                        {currency} {Number(b.total).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Create Purchase Order ───────────────────────────────────── */}
      <Dialog open={newPoOpen} onOpenChange={setNewPoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Purchase Order (PO)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Select Vendor</Label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.company || "Supplier"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Target Product (Optional)</Label>
              <select
                value={poItemProductId}
                onChange={(e) => {
                  setPoItemProductId(e.target.value);
                  const p = products.find((pr: any) => pr.id === e.target.value);
                  if (p) {
                    setPoItemName(p.name);
                    setPoItemPrice(String(p.cost || p.price || 100));
                  }
                }}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Custom Item / Choose Existing Product --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (SKU: {p.sku || "N/A"}) - Stock: {p.stock}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Item Name</Label>
              <Input
                value={poItemName}
                onChange={(e) => setPoItemName(e.target.value)}
                placeholder="e.g. Raw Material Batch A"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-700">Quantity</Label>
                <Input
                  type="number"
                  value={poItemQty}
                  onChange={(e) => setPoItemQty(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-700">Unit Price ({currency})</Label>
                <Input
                  type="number"
                  value={poItemPrice}
                  onChange={(e) => setPoItemPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPoOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedVendorId || !poItemName || Number(poItemQty) <= 0) {
                  toast.error("Please select a vendor and fill in item details.");
                  return;
                }
                createPoMutation.mutate({
                  vendorId: selectedVendorId,
                  notes: poNotes,
                  items: [
                    {
                      productId: poItemProductId || undefined,
                      name: poItemName,
                      quantity: Number(poItemQty),
                      unitPrice: Number(poItemPrice),
                    },
                  ],
                });
              }}
              disabled={createPoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Issue PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create Vendor ───────────────────────────────────────────── */}
      <Dialog open={newVendorOpen} onOpenChange={setNewVendorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier / Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Contact / Supplier Name</Label>
              <Input
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="e.g. Acme Microelectronics"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Company</Label>
              <Input
                value={vCompany}
                onChange={(e) => setVCompany(e.target.value)}
                placeholder="e.g. Acme Corp Ltd"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Email</Label>
              <Input
                type="email"
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
                placeholder="vendor@company.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Phone</Label>
              <Input
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVendorOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!vName) {
                  toast.error("Please provide a supplier name.");
                  return;
                }
                createVendorMutation.mutate({ name: vName, company: vCompany, email: vEmail, phone: vPhone });
              }}
              disabled={createVendorMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
