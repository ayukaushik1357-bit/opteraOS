import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Department, Team } from "@/lib/teams.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/app/AppShell";
import {
  getTeam,
  inviteTeammate,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from "@/lib/workspace.functions";
import {
  listDepartments,
  saveDepartment,
  deleteDepartment,
  listTeams,
  saveTeam,
  deleteTeam,
} from "@/lib/teams.functions";

const title = "Team — opteraOS";
const description =
  "Invite teammates, manage departments, teams and roles across your opteraOS workspace.";

export const Route = createFileRoute("/_authenticated/team")({
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
  component: TeamPage,
});

function TeamPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const fetchTeam = useServerFn(getTeam);
  const invite = useServerFn(inviteTeammate);
  const revoke = useServerFn(revokeInvite);
  const setRole = useServerFn(updateMemberRole);
  const remove = useServerFn(removeMember);
  const fetchDepartments = useServerFn(listDepartments);
  const saveDept = useServerFn(saveDepartment);
  const deleteDept = useServerFn(deleteDepartment);
  const fetchTeams = useServerFn(listTeams);
  const saveTeamFn = useServerFn(saveTeam);
  const deleteTeamFn = useServerFn(deleteTeam);

  const [email, setEmail] = useState("");
  const [role, setRole_] = useState<"admin" | "member">("member");

  // Department dialog state
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptDraft, setDeptDraft] = useState({ id: undefined as string | undefined, name: "", description: "" });

  // Team dialog state
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamDraft, setTeamDraft] = useState({ id: undefined as string | undefined, name: "", description: "", departmentId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["team", current?.id],
    queryFn: () => fetchTeam({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments", current?.id],
    queryFn: () => fetchDepartments({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams", current?.id],
    queryFn: () => fetchTeams({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["team", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["departments", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["teams", current?.id] });
  };
  const canManage = current?.role === "owner" || current?.role === "admin";

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { orgId: current!.id, email, role } }),
    onSuccess: () => {
      setEmail("");
      toast.success("Invitation created");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deptMutation = useMutation({
    mutationFn: () =>
      saveDept({ data: { id: deptDraft.id, orgId: current!.id, name: deptDraft.name, description: deptDraft.description } }),
    onSuccess: () => {
      toast.success(deptDraft.id ? "Department updated" : "Department created");
      setDeptOpen(false);
      setDeptDraft({ id: undefined, name: "", description: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => deleteDept({ data: { id } }),
    onSuccess: () => { toast.success("Department deleted"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const teamMutation = useMutation({
    mutationFn: () =>
      saveTeamFn({ data: { id: teamDraft.id, orgId: current!.id, name: teamDraft.name, description: teamDraft.description, departmentId: teamDraft.departmentId } }),
    onSuccess: () => {
      toast.success(teamDraft.id ? "Team updated" : "Team created");
      setTeamOpen(false);
      setTeamDraft({ id: undefined, name: "", description: "", departmentId: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => deleteTeamFn({ data: { id } }),
    onSuccess: () => { toast.success("Team deleted"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return <p className="text-sm text-muted-foreground">Create a workspace first.</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People, departments and teams in {current.name}.
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            <Users className="mr-1.5 h-4 w-4" />Members
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Building2 className="mr-1.5 h-4 w-4" />Departments
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="mr-1.5 h-4 w-4" />Teams
          </TabsTrigger>
        </TabsList>

        {/* ── MEMBERS TAB ─────────────────────────────────────────── */}
        <TabsContent value="members" className="grid gap-6">
          {canManage && (
            <form
              className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                inviteMutation.mutate();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Invite by email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole_(v as "admin" | "member")}>
                  <SelectTrigger id="invite-role" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="bg-gradient-brand text-primary-foreground"
              >
                Send invite
              </Button>
            </form>
          )}

          {isLoading || !data ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-medium">
                Members · {data.members.length}
              </h2>
              <ul className="mt-4 grid gap-2">
                {data.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.full_name || m.email || m.user_id}</p>
                      {m.email && m.full_name && (
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage && m.role !== "owner" ? (
                        <Select
                          value={m.role}
                          onValueChange={async (v) => {
                            try {
                              await setRole({ data: { memberId: m.id, role: v as "admin" | "member" } });
                              refresh();
                            } catch (err) {
                              toast.error((err as Error).message);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{m.role}</Badge>
                      )}
                      {canManage && m.role !== "owner" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await remove({ data: { memberId: m.id } });
                              refresh();
                            } catch (err) {
                              toast.error((err as Error).message);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && data && data.invites.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-medium">Pending invitations</h2>
              <ul className="mt-4 grid gap-2">
                {data.invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{inv.email}</span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {inv.role}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await revoke({ data: { inviteId: inv.id } });
                          refresh();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Invited teammates join by signing in with the same email address.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── DEPARTMENTS TAB ─────────────────────────────────────── */}
        <TabsContent value="departments" className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Group your team into functional departments (e.g. Sales, Marketing, Finance).
            </p>
            {canManage && (
              <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-brand text-primary-foreground"
                    onClick={() => setDeptDraft({ id: undefined, name: "", description: "" })}
                  >
                    <Plus className="mr-1 h-4 w-4" /> New department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{deptDraft.id ? "Edit Department" : "New Department"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dept-name">Name</Label>
                      <Input
                        id="dept-name"
                        placeholder="e.g. Sales"
                        value={deptDraft.name}
                        onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dept-desc">Description (optional)</Label>
                      <Input
                        id="dept-desc"
                        placeholder="What does this department do?"
                        value={deptDraft.description}
                        onChange={(e) => setDeptDraft({ ...deptDraft, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      className="bg-gradient-brand text-primary-foreground"
                      disabled={deptDraft.name.trim().length < 2 || deptMutation.isPending}
                      onClick={() => deptMutation.mutate()}
                    >
                      Save department
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            {loadingDepts ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : !departments?.length ? (
              <div className="py-10 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 font-medium">No departments yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create departments to organise your company structure (e.g. Sales, Marketing, Finance).
                </p>
              </div>
            ) : (
              <ul className="grid gap-2">
                {departments.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{d.name}</p>
                      {d.description && (
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeptDraft({ id: d.id, name: d.name, description: d.description ?? "" });
                            setDeptOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDeptMutation.mutate(d.id)}
                          aria-label={`Delete ${d.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* ── TEAMS TAB ───────────────────────────────────────────── */}
        <TabsContent value="teams" className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Teams sit inside departments (e.g. Enterprise Sales, SMB Sales inside Sales).
            </p>
            {canManage && (
              <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-brand text-primary-foreground"
                    onClick={() => setTeamDraft({ id: undefined, name: "", description: "", departmentId: "" })}
                  >
                    <Plus className="mr-1 h-4 w-4" /> New team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{teamDraft.id ? "Edit Team" : "New Team"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="team-name">Team name</Label>
                      <Input
                        id="team-name"
                        placeholder="e.g. Enterprise Sales"
                        value={teamDraft.name}
                        onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="team-dept">Department (optional)</Label>
                      <Select
                        value={teamDraft.departmentId}
                        onValueChange={(v) => setTeamDraft({ ...teamDraft, departmentId: v })}
                      >
                        <SelectTrigger id="team-dept">
                          <SelectValue placeholder="Select department…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {(departments ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="team-desc">Description (optional)</Label>
                      <Input
                        id="team-desc"
                        placeholder="What does this team handle?"
                        value={teamDraft.description}
                        onChange={(e) => setTeamDraft({ ...teamDraft, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      className="bg-gradient-brand text-primary-foreground"
                      disabled={teamDraft.name.trim().length < 2 || teamMutation.isPending}
                      onClick={() => teamMutation.mutate()}
                    >
                      Save team
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            {loadingTeams ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : !teams?.length ? (
              <div className="py-10 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 font-medium">No teams yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create teams for targeted lead assignment, automation routing, and task allocation.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2">
                {teams.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(t.departments as { name?: string } | null)?.name ?? "No department"}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTeamDraft({
                              id: t.id,
                              name: t.name,
                              description: t.description ?? "",
                              departmentId: t.department_id ?? "",
                            });
                            setTeamOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTeamMutation.mutate(t.id)}
                          aria-label={`Delete ${t.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
