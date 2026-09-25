import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  Plus,
  Trash2,
  UserPlus,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  listWorkGroups,
  saveWorkGroup,
  deleteWorkGroup,
  addWorkGroupMember,
  removeWorkGroupMember,
  getWorkloadDistribution,
  type WorkGroupRecord,
} from "@/lib/workgroups.functions";
import { getTeam } from "@/lib/workspace.functions";

interface WorkGroupsProps {
  orgId: string;
}

const DEFAULT_COLORS = ["#8B5CF6", "#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EC4899"];

export function WorkGroupsManager({ orgId }: WorkGroupsProps) {
  const queryClient = useQueryClient();
  const fetchGroups = useServerFn(listWorkGroups);
  const saveGroup = useServerFn(saveWorkGroup);
  const deleteGroup = useServerFn(deleteWorkGroup);
  const addMember = useServerFn(addWorkGroupMember);
  const removeMember = useServerFn(removeWorkGroupMember);
  const fetchWorkload = useServerFn(getWorkloadDistribution);
  const fetchTeam = useServerFn(getTeam);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#8B5CF6");
  const [strategy, setStrategy] = useState<any>("round_robin");
  const [skillsInput, setSkillsInput] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState<any>("member");
  const [memberSkillsInput, setMemberSkillsInput] = useState("");

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["work_groups", orgId],
    queryFn: () => fetchGroups({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: workload = [], isLoading: loadingWorkload } = useQuery({
    queryKey: ["workload_distribution", orgId],
    queryFn: () => fetchWorkload({ data: { orgId } }),
    enabled: !!orgId,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team", orgId],
    queryFn: () => fetchTeam({ data: { orgId } }),
    enabled: !!orgId,
  });

  const allMembers = teamData?.members ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      saveGroup({
        data: {
          orgId,
          name: name.trim(),
          description: description.trim(),
          color,
          assignmentStrategy: strategy,
          skills: skillsInput ? skillsInput.split(",").map((s) => s.trim()).filter(Boolean) : [],
        },
      }),
    onSuccess: () => {
      toast.success("Work Group created successfully!");
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      setSkillsInput("");
      queryClient.invalidateQueries({ queryKey: ["work_groups", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workload_distribution", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create work group"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup({ data: { orgId, id } }),
    onSuccess: () => {
      toast.success("Work Group deleted");
      queryClient.invalidateQueries({ queryKey: ["work_groups", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workload_distribution", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete work group"),
  });

  const addMemberMutation = useMutation({
    mutationFn: () => {
      if (!activeGroupId || !selectedUserId) throw new Error("Please select a team member");
      return addMember({
        data: {
          orgId,
          groupId: activeGroupId,
          userId: selectedUserId,
          role: memberRole,
          skills: memberSkillsInput ? memberSkillsInput.split(",").map((s) => s.trim()).filter(Boolean) : [],
        },
      });
    },
    onSuccess: () => {
      toast.success("Member added to group");
      setAddMemberModalOpen(false);
      setSelectedUserId("");
      setMemberSkillsInput("");
      queryClient.invalidateQueries({ queryKey: ["work_groups", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workload_distribution", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add member"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => removeMember({ data: { orgId, id } }),
    onSuccess: () => {
      toast.success("Member removed from group");
      queryClient.invalidateQueries({ queryKey: ["work_groups", orgId] });
      queryClient.invalidateQueries({ queryKey: ["workload_distribution", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove member"),
  });

  return (
    <div className="space-y-8">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-400" />
            <span>Employee Work Groups & Teams</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Organize real organization members into cross-functional units (Sales, CS, Finance) with automated assignment rules.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Work Group</span>
        </Button>
      </div>

      {/* ── Work Groups Grid ──────────────────────────────────────────── */}
      {loadingGroups ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">No Work Groups Yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Create your first work group (e.g. Sales Team, Customer Success) to start routing automated work.
          </p>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Work Group</span>
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(group.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {group.description && (
                  <p className="mt-2 text-xs text-muted-foreground">{group.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] border-[#E2E8F0]">
                    🎯 {group.assignment_strategy.replace("_", " ")}
                  </Badge>
                  <span>{group.members_count ?? 0} members</span>
                  <span>·</span>
                  <span>{group.active_tasks_count ?? 0} active tasks</span>
                </div>

                {/* Member roster */}
                <div className="mt-4 space-y-2 border-t border-[#E2E8F0] pt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">
                      Members
                    </span>
                    <button
                      onClick={() => {
                        setActiveGroupId(group.id);
                        setAddMemberModalOpen(true);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      + Add Member
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(group.members ?? []).length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/60">No members assigned yet.</p>
                    ) : (
                      group.members?.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg bg-secondary/30 px-2.5 py-1.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-foreground truncate block">{m.full_name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{m.role} · {m.current_workload ?? 0} tasks</span>
                          </div>
                          <button
                            onClick={() => removeMemberMutation.mutate(m.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            title="Remove member"
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

      {/* ── Live Member Workload Distribution Meters ─────────────────── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-foreground text-sm">Team Workload & Capacity Meters</h3>
          </div>
          <span className="text-xs text-muted-foreground">Live real-time task balancing</span>
        </div>

        <div className="mt-4 space-y-4">
          {loadingWorkload ? (
            <Skeleton className="h-32 w-full" />
          ) : workload.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active organization members found.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workload.map((w) => (
                <div
                  key={w.userId}
                  className="rounded-xl border border-[#E2E8F0] bg-secondary/20 p-3.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{w.fullName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{w.email}</p>
                    </div>
                    <Badge
                      variant={w.status === "Overloaded" ? "destructive" : w.status === "Busy" ? "secondary" : "outline"}
                      className="text-[10px] py-0"
                    >
                      {w.status}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Active Workload</span>
                      <span className="font-mono">{w.activeTasks} / {w.capacity} tasks ({w.loadPercent}%)</span>
                    </div>
                    <Progress value={w.loadPercent} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Create Work Group ─────────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Create Employee Work Group</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Groups aggregate employees for automated task and lead routing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Group Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Team, Customer Success, Finance"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Core responsibilities and scope"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Default Assignment Strategy</label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="round_robin">Round Robin (Equal Distribution)</SelectItem>
                  <SelectItem value="lowest_workload">Lowest Workload (Capacity Balancing)</SelectItem>
                  <SelectItem value="skill_based">Skill Based Match</SelectItem>
                  <SelectItem value="ai_assignment">AI Intelligent Dispatch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Specialist Skills (comma separated)</label>
              <Input
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g. enterprise_deals, outbound_sales, collections"
                className="mt-1 h-9 text-xs"
              />
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

      {/* ── Modal: Add Member to Group ───────────────────────────────── */}
      <Dialog open={addMemberModalOpen} onOpenChange={setAddMemberModalOpen}>
        <DialogContent className="max-w-md border-[#E2E8F0] bg-white text-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">Add Member to Work Group</DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Select an existing organization member and configure their role and skills.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Select Employee</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Choose a team member..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  {allMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Group Role</label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#CBD5E1] text-[#111827]">
                  <SelectItem value="lead">Team Lead</SelectItem>
                  <SelectItem value="senior">Senior Specialist</SelectItem>
                  <SelectItem value="member">Standard Member</SelectItem>
                  <SelectItem value="specialist">Domain Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#374151]">Member Skills (comma separated)</label>
              <Input
                value={memberSkillsInput}
                onChange={(e) => setMemberSkillsInput(e.target.value)}
                placeholder="e.g. enterprise, collections, negotiations"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMemberModalOpen(false)}
              className="text-xs border-white/20 bg-[#F8FAFC] text-[#1F2937] hover:bg-white/[0.1] hover:text-white font-medium shadow-sm"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedUserId || addMemberMutation.isPending}
              onClick={() => addMemberMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {addMemberMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add to Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
