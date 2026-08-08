import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/app/AppShell";
import { getTeam, inviteTeammate, removeMember, revokeInvite, updateMemberRole } from "@/lib/workspace.functions";

const title = "Team — opteraOS";
const description = "Invite teammates, manage roles and control access across your opteraOS workspace.";

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

  const [email, setEmail] = useState("");
  const [role, setRole_] = useState<"admin" | "member">("member");

  const { data, isLoading } = useQuery({
    queryKey: ["team", current?.id],
    queryFn: () => fetchTeam({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["team", current?.id] });
  const canManage = current?.role === "owner" || current?.role === "admin";

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { orgId: current!.id, email, role } }),
    onSuccess: () => { setEmail(""); toast.success("Invitation created"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return <p className="text-sm text-muted-foreground">Create a workspace first.</p>;
  if (isLoading || !data) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">People with access to {current.name}.</p>
      </div>

      {canManage && (
        <form
          className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }}
        >
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole_(v as "admin" | "member")}>
              <SelectTrigger id="invite-role" className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviteMutation.isPending} className="bg-gradient-brand text-primary-foreground">
            Send invite
          </Button>
        </form>
      )}

      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-medium">Members</h2>
        <ul className="mt-4 grid gap-2">
          {data.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-sm">
              <span className="truncate">{m.full_name || m.email || m.user_id}</span>
              <div className="flex items-center gap-2">
                {canManage && m.role !== "owner" ? (
                  <Select
                    value={m.role}
                    onValueChange={async (v) => {
                      try {
                        await setRole({ data: { memberId: m.id, role: v as "admin" | "member" } });
                        refresh();
                      } catch (err) { toast.error((err as Error).message); }
                    }}
                  >
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{m.role}</span>
                )}
                {canManage && m.role !== "owner" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try { await remove({ data: { memberId: m.id } }); refresh(); }
                      catch (err) { toast.error((err as Error).message); }
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

      {canManage && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-medium">Pending invitations</h2>
          {data.invites.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {data.invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                  <span className="truncate">{inv.email}</span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{inv.role}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try { await revoke({ data: { inviteId: inv.id } }); refresh(); }
                      catch (err) { toast.error((err as Error).message); }
                    }}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Invited teammates join by signing in with the same email address — the invitation appears on their workspace screen.
          </p>
        </div>
      )}
    </div>
  );
}
