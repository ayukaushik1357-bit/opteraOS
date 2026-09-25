import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Sparkles,
  Filter,
  UserPlus,
  Building2,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  listCustomerGroups,
  saveCustomerGroup,
  deleteCustomerGroup,
  addCustomerToGroup,
  removeCustomerFromGroup,
  autoSegmentCustomers,
  type CustomerGroupRecord,
} from "@/lib/customergroups.functions";
import { listCustomers } from "@/lib/crm.functions";

interface CustomerGroupsProps {
  orgId: string;
}

export function CustomerGroupsManager({ orgId }: CustomerGroupsProps) {
  const queryClient = useQueryClient();
  const fetchGroups = useServerFn(listCustomerGroups);
  const saveGroup = useServerFn(saveCustomerGroup);
  const deleteGroup = useServerFn(deleteCustomerGroup);
  const addCustomer = useServerFn(addCustomerToGroup);
  const removeCustomer = useServerFn(removeCustomerFromGroup);
  const runAutoSegment = useServerFn(autoSegmentCustomers);
  const fetchCustomers = useServerFn(listCustomers);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["customer_groups", orgId],
    queryFn: () => fetchGroups({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => fetchCustomers({ data: { orgId } }),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      saveGroup({
        data: {
          orgId,
          name: name.trim(),
          description: description.trim(),
          color,
          criteria: { status: statusFilter },
        },
      }),
    onSuccess: () => {
      toast.success("Customer Group created!");
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["customer_groups", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create group"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup({ data: { orgId, id } }),
    onSuccess: () => {
      toast.success("Customer Group deleted");
      queryClient.invalidateQueries({ queryKey: ["customer_groups", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete group"),
  });

  const addCustomerMutation = useMutation({
    mutationFn: () => {
      if (!activeGroupId || !selectedCustomerId) throw new Error("Select a customer");
      return addCustomer({
        data: {
          orgId,
          groupId: activeGroupId,
          customerId: selectedCustomerId,
        },
      });
    },
    onSuccess: () => {
      toast.success("Customer added to group");
      setAddCustomerModalOpen(false);
      setSelectedCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["customer_groups", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add customer"),
  });

  const removeCustomerMutation = useMutation({
    mutationFn: (id: string) => removeCustomer({ data: { orgId, id } }),
    onSuccess: () => {
      toast.success("Customer removed from group");
      queryClient.invalidateQueries({ queryKey: ["customer_groups", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove customer"),
  });

  const autoSegmentMutation = useMutation({
    mutationFn: (groupId: string) => runAutoSegment({ data: { orgId, groupId } }),
    onSuccess: (res) => {
      toast.success(`Auto-segmented: matched and updated ${res.addedCount} customers`);
      queryClient.invalidateQueries({ queryKey: ["customer_groups", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Auto-segmentation failed"),
  });

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>Customer Groups & Segments</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Segment real customers (VIP, Enterprise, At-Risk) to drive targeted Autopilot workflows and routing.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer Group</span>
        </Button>
      </div>

      {/* ── Customer Groups Grid ──────────────────────────────────────── */}
      {loadingGroups ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">No Customer Groups Yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Create groups (e.g. VIP Accounts, Enterprise Tier, At-Risk Accounts) to enable targeted routing.
          </p>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Customer Group</span>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-card p-5 shadow-sm transition-all hover:border-indigo-500/30"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-3 w-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <h3 className="font-semibold text-foreground text-sm">{group.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Run auto-segmentation"
                      onClick={() => autoSegmentMutation.mutate(group.id)}
                      disabled={autoSegmentMutation.isPending}
                      className="h-7 w-7 text-muted-foreground hover:text-indigo-400"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${autoSegmentMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(group.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {group.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{group.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{group.members_count ?? 0} customer accounts</span>
                  {(group.criteria as any)?.["status"] && (
                    <Badge variant="outline" className="text-[10px] border-[#E2E8F0]">
                      status: {(group.criteria as any)["status"]}
                    </Badge>
                  )}
                </div>

                {/* Customer Roster */}
                <div className="mt-4 space-y-2 border-t border-[#E2E8F0] pt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">
                      Enrolled Customers
                    </span>
                    <button
                      onClick={() => {
                        setActiveGroupId(group.id);
                        setAddCustomerModalOpen(true);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      + Add Customer
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(group.members ?? []).length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/60">No customers in this group yet.</p>
                    ) : (
                      group.members?.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg bg-secondary/30 px-2.5 py-1.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-foreground truncate block">
                              {m.customer_name} {m.customer_company ? `(${m.customer_company})` : ""}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{m.customer_status}</span>
                          </div>
                          <button
                            onClick={() => removeCustomerMutation.mutate(m.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            title="Remove customer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create Customer Group ─────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Create Customer Group</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Define customer segment criteria for autonomous routing and actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Group Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP Accounts, Enterprise Tier, At-Risk Customers"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Segment definition and purpose"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Customer Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="all">All Customer Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="prospect">Prospects Only</SelectItem>
                  <SelectItem value="churned">Churned Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Add Customer to Group ─────────────────────────────── */}
      <Dialog open={addCustomerModalOpen} onOpenChange={setAddCustomerModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Add Customer to Group</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Choose an existing customer from CRM to link to this group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Select Customer</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  {allCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddCustomerModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedCustomerId || addCustomerMutation.isPending}
              onClick={() => addCustomerMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {addCustomerMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
