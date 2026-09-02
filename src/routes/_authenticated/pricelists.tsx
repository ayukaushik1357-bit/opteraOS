import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Percent, Plus, Search, RefreshCw, CheckCircle2, Trash2, Calculator,
  Sparkles, Layers, ArrowRight, Tag, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { pricelistsApi, productsApi } from "@/lib/api";
import { useWorkspace } from "@/components/app/AppShell";
import { money } from "@/lib/format";
import { appHead } from "@/lib/app-head";
import { PageHeader, EmptyState } from "@/components/shared/ui-kit";
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

export const Route = createFileRoute("/_authenticated/pricelists")({
  head: appHead("Price Lists", "Multi-tier dynamic pricing engine, volume breaks, and rule-based calculations."),
  component: PriceListsPage,
});

export function PriceListsPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPricelist, setSelectedPricelist] = useState<any | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Simulator state
  const [calcProductId, setCalcProductId] = useState("");
  const [calcQuantity, setCalcQuantity] = useState(10);
  const [calcResult, setCalcResult] = useState<any | null>(null);

  const [newPricelist, setNewPricelist] = useState({
    name: "Wholesale & Volume Tier",
    code: "WHOLESALE",
    currency: "INR",
    description: "Volume-based discounted prices for distributors and bulk clients.",
    isDefault: false,
  });

  const [newRule, setNewRule] = useState({
    productId: "",
    minQuantity: 5,
    pricingType: "PERCENTAGE_DISCOUNT",
    discountPercent: 15,
    fixedPrice: 0,
  });

  // Queries
  const { data: pricelists, isLoading, refetch } = useQuery({
    queryKey: ["pricelists", orgId],
    queryFn: () => pricelistsApi.list(orgId),
    enabled: !!orgId,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: () => productsApi.list(orgId, { pageSize: 100 }),
    enabled: !!orgId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => pricelistsApi.create(orgId, newPricelist),
    onSuccess: () => {
      toast.success("Price list created");
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ["pricelists", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create price list"),
  });

  const addRuleMutation = useMutation({
    mutationFn: () =>
      pricelistsApi.addItem(orgId, selectedPricelist.id, {
        productId: newRule.productId || undefined,
        minQuantity: Number(newRule.minQuantity),
        pricingType: newRule.pricingType,
        discountPercent: newRule.pricingType === "PERCENTAGE_DISCOUNT" ? Number(newRule.discountPercent) : undefined,
        fixedPrice: newRule.pricingType === "FIXED" ? Number(newRule.fixedPrice) : undefined,
      }),
    onSuccess: () => {
      toast.success("Pricing rule added");
      setShowRuleModal(false);
      queryClient.invalidateQueries({ queryKey: ["pricelists", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add rule"),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (itemId: string) => pricelistsApi.removeItem(orgId, selectedPricelist.id, itemId),
    onSuccess: () => {
      toast.success("Pricing rule removed");
      queryClient.invalidateQueries({ queryKey: ["pricelists", orgId] });
    },
  });

  const handleSimulate = async () => {
    if (!calcProductId) return;
    try {
      const res = await pricelistsApi.calculatePrice(orgId, {
        productId: calcProductId,
        pricelistId: selectedPricelist?.id || undefined,
        quantity: Number(calcQuantity),
      });
      setCalcResult(res);
    } catch (err: any) {
      toast.error(err.message || "Simulation error");
    }
  };

  const activePricelist = selectedPricelist || pricelists?.[0] || null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Price Lists"
        subtitle="Manage multi-tier pricing strategies, category volume breaks, and customer specific agreements."
        actions={
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Create Price List
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Price lists overview */}
        <div className="space-y-4">
          <h2 className="font-bold text-sm text-foreground uppercase tracking-wider">Active Price Lists</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (pricelists || []).length === 0 ? (
            <EmptyState title="No price lists" description="Create a price list to configure custom rules." />
          ) : (
            <div className="space-y-2.5">
              {pricelists.map((pl: any) => (
                <div
                  key={pl.id}
                  onClick={() => {
                    setSelectedPricelist(pl);
                    setCalcResult(null);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activePricelist?.id === pl.id
                      ? "border-blue-500 bg-blue-50/50 shadow-xs"
                      : "border-[#E5EAF1] bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900">{pl.name}</p>
                    {pl.isDefault && (
                      <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pl.description || "No description"}</p>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-gray-400">
                    <span>{pl.items?.length || 0} Pricing Rules</span>
                    <span className="font-mono text-gray-700">{pl.currency || currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real-time Pricing Simulator Tool */}
          <div className="p-5 rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 mt-6">
            <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span>Live Price Calculation Simulator</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Test how this price list evaluates discounts and volume breaks for a specific product and quantity.
            </p>

            <div className="space-y-3">
              <div className="grid gap-1">
                <Label className="text-xs">Select Product</Label>
                <Select value={calcProductId} onValueChange={setCalcProductId}>
                  <SelectTrigger className="h-8 text-xs bg-white border-[#E5EAF1]">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsData?.rows?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({money(Number(p.price || 0), currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs">Order Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(Number(e.target.value))}
                  className="h-8 text-xs bg-white border-[#E5EAF1]"
                />
              </div>

              <Button
                size="sm"
                className="w-full bg-blue-600 text-white hover:bg-blue-700 h-8 text-xs"
                onClick={handleSimulate}
                disabled={!calcProductId}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Evaluate Price
              </Button>

              {calcResult && (
                <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] space-y-1.5 text-xs mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Base Unit Price:</span>
                    <span className="font-semibold text-gray-900">{money(calcResult.basePrice, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Final Unit Price:</span>
                    <span className="font-bold text-green-700">{money(calcResult.unitPrice, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rule Applied:</span>
                    <span className="font-mono text-[11px] text-blue-600">{calcResult.ruleApplied}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#E5EAF1] font-bold text-gray-900">
                    <span>Total ({calcResult.quantity} units):</span>
                    <span>{money(calcResult.total, currency)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Selected Pricelist Rules Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-foreground uppercase tracking-wider">
                {activePricelist?.name || "Pricing Rules"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluation priority: Variant Rule &gt; Product Rule &gt; Category Rule &gt; Global Rule
              </p>
            </div>
            {activePricelist && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setShowRuleModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-[#E5EAF1]">
                <tr>
                  <th className="px-4 py-3">Target Scope</th>
                  <th className="px-4 py-3">Min Qty</th>
                  <th className="px-4 py-3">Pricing Mechanism</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF1]">
                {activePricelist?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No custom rules added. Base product catalog prices will apply.
                    </td>
                  </tr>
                ) : (
                  (activePricelist?.items || []).map((rule: any) => (
                    <tr key={rule.id} className="hover:bg-muted/20 text-xs">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {rule.product?.name || rule.category?.name || "All Products (Global)"}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        &ge; {rule.minQuantity} units
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px]">
                          {rule.pricingType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {rule.pricingType === "FIXED"
                          ? money(Number(rule.fixedPrice), currency)
                          : `${rule.discountPercent}% OFF`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Pricelist Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Dynamic Price List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3.5 py-2">
            <div className="grid gap-1.5">
              <Label>Price List Name *</Label>
              <Input
                value={newPricelist.name}
                onChange={(e) => setNewPricelist({ ...newPricelist, name: e.target.value })}
                placeholder="Enterprise Partner Tier"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Code</Label>
                <Input
                  value={newPricelist.code}
                  onChange={(e) => setNewPricelist({ ...newPricelist, code: e.target.value })}
                  placeholder="PARTNER-V1"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <Input
                  value={newPricelist.currency}
                  onChange={(e) => setNewPricelist({ ...newPricelist, currency: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input
                value={newPricelist.description}
                onChange={(e) => setNewPricelist({ ...newPricelist, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
              disabled={!newPricelist.name || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create Price List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Modal */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pricing Rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3.5 py-2">
            <div className="grid gap-1.5">
              <Label>Target Product (optional: leave empty for Global rule)</Label>
              <Select value={newRule.productId} onValueChange={(v) => setNewRule({ ...newRule, productId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Products (Global)</SelectItem>
                  {productsData?.rows?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Min Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={newRule.minQuantity}
                  onChange={(e) => setNewRule({ ...newRule, minQuantity: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Pricing Type</Label>
                <Select value={newRule.pricingType} onValueChange={(v) => setNewRule({ ...newRule, pricingType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE_DISCOUNT">Percentage Discount</SelectItem>
                    <SelectItem value="FIXED">Fixed Override Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newRule.pricingType === "PERCENTAGE_DISCOUNT" ? (
              <div className="grid gap-1.5">
                <Label>Discount Percentage (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newRule.discountPercent}
                  onChange={(e) => setNewRule({ ...newRule, discountPercent: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label>Fixed Unit Price ({currency})</Label>
                <Input
                  type="number"
                  value={newRule.fixedPrice}
                  onChange={(e) => setNewRule({ ...newRule, fixedPrice: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
              disabled={addRuleMutation.isPending}
              onClick={() => addRuleMutation.mutate()}
            >
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
