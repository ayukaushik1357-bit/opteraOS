import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wrench,
  Factory,
  Plus,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Hammer,
  ShieldCheck,
  Cpu,
  Package,
  Loader2,
  Clock,
  Sparkles,
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
import { manufacturingApi, productsApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "Manufacturing (MRP) & Maintenance — opteraOS";
const description = "Bills of materials, production work orders, quality inspections, and equipment maintenance.";

export const Route = createFileRoute("/_authenticated/manufacturing")({
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
  component: ManufacturingMasterPage,
});

function ManufacturingMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("orders");
  const [newMoOpen, setNewMoOpen] = useState(false);
  const [newBomOpen, setNewBomOpen] = useState(false);
  const [newEquipOpen, setNewEquipOpen] = useState(false);

  // Queries
  const { data: boms = [], isLoading: loadingBoms } = useQuery({
    queryKey: ["manufacturing_boms", orgId],
    queryFn: () => manufacturingApi.getBOMs(orgId),
    enabled: !!orgId,
  });

  const { data: moRes, isLoading: loadingMos } = useQuery({
    queryKey: ["manufacturing_orders", orgId],
    queryFn: () => manufacturingApi.getOrders(orgId),
    enabled: !!orgId,
  });
  const orders = moRes?.rows || [];

  const { data: equipments = [], isLoading: loadingEquip } = useQuery({
    queryKey: ["manufacturing_equipments", orgId],
    queryFn: () => manufacturingApi.getEquipments(orgId),
    enabled: !!orgId,
  });

  const { data: qualityChecks = [] } = useQuery({
    queryKey: ["manufacturing_quality", orgId],
    queryFn: () => manufacturingApi.getQualityChecks(orgId),
    enabled: !!orgId,
  });

  const { data: productsRes } = useQuery({
    queryKey: ["products_list", orgId],
    queryFn: () => productsApi.list(orgId),
    enabled: !!orgId,
  });
  const products = productsRes?.rows || productsRes || [];

  // Mutations
  const createBomMutation = useMutation({
    mutationFn: (dto: any) => manufacturingApi.createBOM(orgId, dto),
    onSuccess: () => {
      toast.success("Bill of Materials saved!");
      setNewBomOpen(false);
      queryClient.invalidateQueries({ queryKey: ["manufacturing_boms", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create BOM"),
  });

  const createMoMutation = useMutation({
    mutationFn: (dto: any) => manufacturingApi.createOrder(orgId, dto),
    onSuccess: () => {
      toast.success("Manufacturing Order scheduled!");
      setNewMoOpen(false);
      queryClient.invalidateQueries({ queryKey: ["manufacturing_orders", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create MO"),
  });

  const completeMoMutation = useMutation({
    mutationFn: (id: string) => manufacturingApi.completeOrder(orgId, id),
    onSuccess: () => {
      toast.success("Production finished: Raw components consumed and finished goods stock added!");
      queryClient.invalidateQueries({ queryKey: ["manufacturing_orders", orgId] });
      queryClient.invalidateQueries({ queryKey: ["products_list", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to complete MO"),
  });

  const createEquipMutation = useMutation({
    mutationFn: (dto: any) => manufacturingApi.createEquipment(orgId, dto),
    onSuccess: () => {
      toast.success("Equipment added to maintenance registry!");
      setNewEquipOpen(false);
      queryClient.invalidateQueries({ queryKey: ["manufacturing_equipments", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add equipment"),
  });

  // State for MO form
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedBomId, setSelectedBomId] = useState("");
  const [moQty, setMoQty] = useState("10");

  // State for BOM form
  const [bomCode, setBomCode] = useState("");
  const [bomProductId, setBomProductId] = useState("");
  const [bomComponentId, setBomComponentId] = useState("");
  const [bomCompQty, setBomCompQty] = useState("2");

  // State for Equipment form
  const [eqName, setEqName] = useState("");
  const [eqSerial, setEqSerial] = useState("");
  const [eqCategory, setEqCategory] = useState("Machinery");

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Manufacturing (MRP) &amp; Maintenance
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Bills of Materials (BOM), production scheduling, component consumption, quality, and preventative equipment maintenance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewBomOpen(true)}
            className="text-xs h-9"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Create BOM
          </Button>

          <Button
            size="sm"
            onClick={() => setNewMoOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm text-xs h-9 font-medium"
          >
            <Plus className="h-4 w-4" /> New Production Order
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F8FAFC] border border-[#E5EAF1] p-1">
          <TabsTrigger value="orders" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Factory className="h-3.5 w-3.5" /> Production Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="boms" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Layers className="h-3.5 w-3.5" /> Bills of Materials ({boms.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Wrench className="h-3.5 w-3.5" /> Maintenance &amp; Equipment ({equipments.length})
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Quality Checks ({qualityChecks.length})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Production Orders ────────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Manufacturing &amp; Production Orders</h2>
              <span className="text-xs text-gray-500">{orders.length} active / completed orders</span>
            </div>

            {loadingMos ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Factory className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Production Orders Running</p>
                <p className="text-xs text-gray-500 mt-1">Schedule a manufacturing run to assemble finished goods from raw parts.</p>
                <Button size="sm" onClick={() => setNewMoOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Create First Production Order
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">MO Number</TableHead>
                    <TableHead className="text-gray-500">Finished Product</TableHead>
                    <TableHead className="text-gray-500">Target Qty</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-gray-500">Start Date</TableHead>
                    <TableHead className="text-right text-gray-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {orders.map((mo: any) => (
                    <TableRow key={mo.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{mo.moNumber}</TableCell>
                      <TableCell className="text-xs text-gray-900 font-medium">{mo.product?.name || "Product"}</TableCell>
                      <TableCell className="text-xs text-gray-600">{mo.quantity} units</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            mo.status === "COMPLETED"
                              ? "border-green-200 text-green-700 bg-green-50"
                              : "border-blue-200 text-blue-700 bg-blue-50"
                          }`}
                        >
                          {mo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{shortDate(mo.startDate)}</TableCell>
                      <TableCell className="text-right">
                        {mo.status !== "COMPLETED" ? (
                          <Button
                            size="sm"
                            onClick={() => completeMoMutation.mutate(mo.id)}
                            disabled={completeMoMutation.isPending}
                            className="h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Produce &amp; Finish
                          </Button>
                        ) : (
                          <span className="text-[11px] text-green-700 flex items-center justify-end gap-1 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Stock Updated
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 2. Bills of Materials (BOM) ─────────────────────────────────────── */}
        <TabsContent value="boms" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Bills of Materials (Engineering Recipes)</h2>
                <p className="text-xs text-gray-500">Specify exact component ingredients required for assembled products</p>
              </div>
              <Button size="sm" onClick={() => setNewBomOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add BOM
              </Button>
            </div>

            {loadingBoms ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : boms.length === 0 ? (
              <div className="p-12 text-center">
                <Layers className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No BOMs Defined</p>
                <p className="text-xs text-gray-500 mt-1">Define Bills of Materials to specify assembly recipe components.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">BOM Code</TableHead>
                    <TableHead className="text-gray-500">Assembled Product</TableHead>
                    <TableHead className="text-gray-500">Components</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {boms.map((b: any) => (
                    <TableRow key={b.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{b.code}</TableCell>
                      <TableCell className="text-xs text-gray-900 font-medium">{b.product?.name || "Product"}</TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {(b.components || [])
                          .map((c: any) => `${c.product?.name || "Item"} (x${c.quantity})`)
                          .join(", ") || "No components"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 3. Maintenance & Equipment ──────────────────────────────────────── */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Equipment Registry &amp; Preventative Maintenance</h2>
              <Button size="sm" onClick={() => setNewEquipOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Equipment
              </Button>
            </div>

            {loadingEquip ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : equipments.length === 0 ? (
              <div className="p-12 text-center">
                <Wrench className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Equipment Registered</p>
                <p className="text-xs text-gray-500 mt-1">Register factory machinery, vehicles, and tools for scheduled servicing.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Equipment Name</TableHead>
                    <TableHead className="text-gray-500">Serial #</TableHead>
                    <TableHead className="text-gray-500">Category</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-gray-500">Service Cycle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {equipments.map((eq: any) => (
                    <TableRow key={eq.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-bold text-gray-900">{eq.name}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{eq.serialNumber || "—"}</TableCell>
                      <TableCell className="text-xs text-gray-600">{eq.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px]">
                          {eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">Every {eq.maintenancePeriodDays} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 4. Quality Checks ───────────────────────────────────────────────── */}
        <TabsContent value="quality" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 text-center">
            <ShieldCheck className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">Quality Inspection Points</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Automated pass/fail quality assurance triggers ensure all finished products conform to enterprise standards.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Create MO ───────────────────────────────────────────────── */}
      <Dialog open={newMoOpen} onOpenChange={setNewMoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Production Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Target Product</Label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select Finished Product --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Target Quantity to Manufacture</Label>
              <Input
                type="number"
                value={moQty}
                onChange={(e) => setMoQty(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMoOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedProductId || Number(moQty) <= 0) {
                  toast.error("Please select a product and valid quantity.");
                  return;
                }
                const bom = boms.find((b: any) => b.productId === selectedProductId);
                createMoMutation.mutate({
                  productId: selectedProductId,
                  bomId: bom?.id || undefined,
                  quantity: Number(moQty),
                });
              }}
              disabled={createMoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Start Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create BOM ──────────────────────────────────────────────── */}
      <Dialog open={newBomOpen} onOpenChange={setNewBomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Define Bill of Materials</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">BOM Code</Label>
              <Input
                value={bomCode}
                onChange={(e) => setBomCode(e.target.value)}
                placeholder="e.g. BOM-PROD-01"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-gray-700">Finished Product</Label>
              <select
                value={bomProductId}
                onChange={(e) => setBomProductId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Assembled Product --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Raw Component Part</Label>
              <select
                value={bomComponentId}
                onChange={(e) => setBomComponentId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Raw Ingredient --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700">Component Quantity Required</Label>
              <Input
                type="number"
                value={bomCompQty}
                onChange={(e) => setBomCompQty(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBomOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!bomCode || !bomProductId || !bomComponentId) {
                  toast.error("Please fill in BOM code, finished product, and component.");
                  return;
                }
                createBomMutation.mutate({
                  code: bomCode,
                  productId: bomProductId,
                  components: [{ productId: bomComponentId, quantity: Number(bomCompQty) }],
                });
              }}
              disabled={createBomMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Save BOM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Create Equipment ────────────────────────────────────────── */}
      <Dialog open={newEquipOpen} onOpenChange={setNewEquipOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Equipment Name</Label>
              <Input
                value={eqName}
                onChange={(e) => setEqName(e.target.value)}
                placeholder="e.g. CNC Milling Machine 4-Axis"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Serial Number</Label>
              <Input
                value={eqSerial}
                onChange={(e) => setEqSerial(e.target.value)}
                placeholder="e.g. SN-8849-XYZ"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Category</Label>
              <Input
                value={eqCategory}
                onChange={(e) => setEqCategory(e.target.value)}
                placeholder="Machinery, Electronics, Vehicles"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewEquipOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!eqName) {
                  toast.error("Please provide equipment name.");
                  return;
                }
                createEquipMutation.mutate({ name: eqName, serialNumber: eqSerial, category: eqCategory });
              }}
              disabled={createEquipMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Save Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
