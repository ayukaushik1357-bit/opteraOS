import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getInviteLinkInfo, acceptInviteByToken } from "@/lib/workspace.functions";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Join Workspace — opteraOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { token } = (Route.useParams as any)() as { token: string };
  const navigate = useNavigate();
  const fetchInfo = useServerFn(getInviteLinkInfo);
  const acceptLink = useServerFn(acceptInviteByToken);

  const [session, setSession] = useState<{ user: { email?: string } } | null | "loading">("loading");
  const [accepted, setAccepted] = useState(false);
  const [acceptedOrgId, setAcceptedOrgId] = useState<string | null>(null);

  // Check current auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Fetch invite link info (public)
  const { data: info, isLoading: loadingInfo } = useQuery({
    queryKey: ["invite_link_info", token],
    queryFn: () => fetchInfo({ data: { token } }),
    staleTime: 60_000,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptLink({ data: { token } }),
    onSuccess: (result) => {
      setAccepted(true);
      setAcceptedOrgId(result.orgId);
    },
  });

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (session === "loading" || loadingInfo) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  // ─── Invalid link ─────────────────────────────────────────────────────────
  if (!info?.valid) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-white">Invite link unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">{info?.reason ?? "This invite link is not valid."}</p>
        </div>
      </div>
    );
  }

  // ─── Accepted ────────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-white">
            You've joined <span className="text-indigo-400">{info.orgName}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Your role: <span className="font-medium text-white capitalize">{info.role}</span>
          </p>
          <Button
            className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ─── Not logged in → show auth prompt ────────────────────────────────────
  if (!session) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4">
        <div className="max-w-sm w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10">
              <Users className="h-7 w-7 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white">
              Join <span className="text-indigo-400">{info.orgName}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              You've been invited to join as a <strong className="text-white capitalize">{info.role}</strong>.
              Sign in or create an account to accept.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <p className="text-center text-sm text-slate-400 mb-4">
              You need to sign in to accept this invitation.
            </p>
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              onClick={() => navigate({ to: "/auth", search: { next: `/join/${token}` } as any })}
            >
              Sign in to accept invite
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-600">
            Expires {new Date(info.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  // ─── Logged in → show accept button ──────────────────────────────────────
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4">
      <div className="max-w-sm w-full">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10">
            <Users className="h-7 w-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Join <span className="text-indigo-400">{info.orgName}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            You're signed in as <span className="text-white">{(session as any)?.user?.email}</span>.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">Workspace</p>
            <p className="font-medium text-white">{info.orgName}</p>
            <p className="mt-2 text-sm text-slate-400">Your role</p>
            <p className="font-medium capitalize text-indigo-400">{info.role}</p>
          </div>

          {acceptMutation.isError && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-destructive">{(acceptMutation.error as Error).message}</p>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining…</>
            ) : `Accept & join ${info.orgName}`}
          </Button>

          <Button
            variant="ghost"
            className="mt-2 w-full text-slate-400"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Maybe later
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          This invite expires {new Date(info.expiresAt).toLocaleDateString()}.
          Powered by <span className="text-indigo-500">opteraOS</span>.
        </p>
      </div>
    </div>
  );
}
