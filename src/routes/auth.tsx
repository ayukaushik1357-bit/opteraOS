import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const title = "Sign in — opteraOS";
const description = "Sign in to your opteraOS workspace to run CRM, sales, invoices, inventory and AI automation in one system.";

export const Route = createFileRoute("/auth")({
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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setSent(true);
  }

  async function oauth(provider: "google" | "apple"): Promise<void> {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Could not start sign-in. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/"><BrandLockup /></Link>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <h1 className="text-center text-2xl font-semibold tracking-tight">Welcome to opteraOS</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            One system. Smarter business.
          </p>

          {sent ? (
            <p className="mt-8 rounded-xl border border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
              Check your email to confirm your account, then come back and sign in.
            </p>
          ) : (
            <>
              <div className="mt-6 grid gap-2">
                <Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
                <Button variant="outline" onClick={() => oauth("apple")}>Continue with Apple</Button>
              </div>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form className="mt-4 grid gap-4" onSubmit={signIn}>
                    <Fields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
                    <Button type="submit" disabled={loading} className="bg-gradient-brand text-primary-foreground">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form className="mt-4 grid gap-4" onSubmit={signUp}>
                    <Fields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
                    <Button type="submit" disabled={loading} className="bg-gradient-brand text-primary-foreground">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Fields({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
      </div>
    </>
  );
}
