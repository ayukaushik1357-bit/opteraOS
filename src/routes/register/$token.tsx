import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCustomerRegTokenInfo, submitCustomerRegistration } from "@/lib/crm.functions";

export const Route = createFileRoute("/register/$token")({
  head: () => ({
    meta: [
      { title: "Customer Registration" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerRegistrationPage,
});

function CustomerRegistrationPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { token } = (Route.useParams as any)() as { token: string };
  const fetchInfo = useServerFn(getCustomerRegTokenInfo);
  const submitReg = useServerFn(submitCustomerRegistration);

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data: info, isLoading: loadingInfo } = useQuery({
    queryKey: ["reg_token_info", token],
    queryFn: () => fetchInfo({ data: { token } }),
    staleTime: 60_000,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitReg({ data: { token, ...form } }),
    onSuccess: () => setSubmitted(true),
  });

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loadingInfo) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  // ─── Invalid token ────────────────────────────────────────────────────────
  if (!info?.valid) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-white">Link unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">{info?.reason ?? "This registration link is not valid."}</p>
        </div>
      </div>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-white">You're registered!</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your details have been submitted to <strong className="text-white">{info.orgName}</strong>.
            They will be in touch with you shortly.
          </p>
        </div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#070913] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10">
            <Building2 className="h-7 w-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Register with <span className="text-indigo-400">{info.orgName}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Fill in your details below. This does not create an account or give you access to any
            dashboard.
          </p>
        </div>

        <form
          className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="reg-name" className="text-slate-300">
              Full name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="reg-name"
              required
              minLength={2}
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reg-company" className="text-slate-300">Company / Organisation</Label>
            <Input
              id="reg-company"
              placeholder="Where do you work?"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="reg-email" className="text-slate-300">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reg-phone" className="text-slate-300">Phone</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {submitMutation.isError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-destructive">{(submitMutation.error as Error).message}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500"
            disabled={form.name.trim().length < 2 || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
            ) : "Submit my details"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-600">
          Powered by <span className="text-indigo-500">opteraOS</span>. Your information is securely stored and will not be shared.
        </p>
      </div>
    </div>
  );
}
