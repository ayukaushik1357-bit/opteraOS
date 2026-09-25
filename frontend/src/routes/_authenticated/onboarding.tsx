import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { acceptInvite, createOrganization } from "@/lib/workspace.functions";
import { useWorkspace } from "@/components/app/AppShell";

const title = "Create your workspace — opteraOS";
const description =
  "Set up your opteraOS workspace and invite your team to one intelligent business operating system.";

export const Route = createFileRoute("/_authenticated/onboarding")({
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
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { invites, setCurrent } = useWorkspace();
  const create = useServerFn(createOrganization);
  const accept = useServerFn(acceptInvite);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name, currency } }),
    onSuccess: async (org) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setCurrent(org.id);
      toast.success(`${org.name} is ready`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (inviteId: string) => accept({ data: { inviteId } }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setCurrent(res.orgId);
      toast.success("You've joined the workspace");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl py-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Create your workspace</h1>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        Every business runs in its own opteraOS workspace. You'll be the owner and can invite
        teammates next.
      </p>

      {invites.length > 0 && (
        <div className="mt-6 rounded-xl border border-[#E5EAF1] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pending invitations</h2>
          <ul className="mt-3 grid gap-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#F8FAFC] dark:bg-[#061417] border border-[#E5EAF1] dark:border-teal-500/20 px-3 py-2"
              >
                <span className="text-xs text-gray-800 dark:text-slate-200">
                  {invite.org_name} <span className="text-gray-500 dark:text-slate-400">· {invite.role}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acceptMutation.mutate(invite.id)}
                  className="text-xs h-7 border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#0F2423] dark:text-slate-200"
                >
                  Join
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="mt-6 grid gap-4 rounded-xl border border-[#E5EAF1] dark:border-teal-500/20 bg-white dark:bg-[#091b1f] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
      >
        <div className="grid gap-2 text-xs">
          <Label htmlFor="name" className="text-gray-700 dark:text-slate-200 font-medium">Business name</Label>
          <Input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Traders"
          />
        </div>
        <div className="grid gap-2 text-xs">
          <Label htmlFor="currency" className="text-gray-700 dark:text-slate-200 font-medium">Reporting currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency" className="h-9 border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#0F2423] dark:text-white bg-white dark:bg-[#061417]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#091b1f] border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#0F2423] dark:text-white">
              {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-[#008080] hover:bg-[#006666] text-white font-medium h-9 text-xs mt-2"
        >
          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
          workspace
        </Button>
      </form>
    </div>
  );
}
