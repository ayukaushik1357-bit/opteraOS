import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { initiateGoogleOAuth } from "@/lib/auth.functions";

const title = "Sign in — opteraOS";
const description =
  "Sign in to your opteraOS workspace to run CRM, sales, invoices, inventory and AI automation in one system.";

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

type AuthMode = "signin" | "signup" | "forgot" | "update-password";

function calculatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: "", color: "bg-slate-700" };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score === 3) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 4) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

function AuthPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  const startGoogleOAuth = useServerFn(initiateGoogleOAuth);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [sentSignUp, setSentSignUp] = useState(false);
  const [sentForgot, setSentForgot] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Check for recovery token or errors in URL
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";

    if (hash.includes("type=recovery") || search.includes("mode=recovery")) {
      setAuthMode("update-password");
    }

    const params = new URLSearchParams(search);
    const errorParam = params.get("error");
    if (errorParam) {
      toast.error(decodeURIComponent(errorParam));
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update-password");
      } else if (event === "SIGNED_IN" && authMode !== "update-password") {
        window.location.replace("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (
        data.session &&
        !hash.includes("type=recovery") &&
        !search.includes("mode=recovery") &&
        authMode !== "update-password"
      ) {
        window.location.replace("/dashboard");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [authMode]);

  // Sign In with password
  async function signIn(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.replace("/dashboard");
  }

  // Create account
  async function signUp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      window.location.replace("/dashboard");
      return;
    }
    setSentSignUp(true);
  }

  // Forgot password request
  async function handleForgotPassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your work email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=recovery`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSentForgot(true);
    toast.success("Password reset instructions sent to your email!");
  }

  // Set new password after authorization / recovery link
  async function handleUpdatePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPasswordUpdated(true);
    toast.success("Password updated successfully! Welcome to opteraOS.");
    setTimeout(() => {
      window.location.replace("/dashboard");
    }, 1200);
  }

  // opteraOS Backend API Google OAuth Handshake
  async function handleGoogleOAuth(): Promise<void> {
    try {
      setOauthLoading("google");
      const redirectUri = `${window.location.origin}/auth/callback`;

      const res = await startGoogleOAuth({ data: { redirectUri } });
      if (res.success) {
        if (res.state) {
          sessionStorage.setItem("optera_oauth_state", res.state);
        }
        window.location.href = res.url;
        return;
      }

      const serverError = res.error;

      // Fallback: Attempt Supabase Client OAuth if backend server credentials are not yet configured
      const { error: supaError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
        },
      });

      if (supaError) {
        setOauthLoading(null);
        toast.error(
          serverError ||
            "Google OAuth is not configured. Please define GOOGLE_CLIENT_ID in .env or configure Google in Supabase Auth.",
        );
        return;
      }
    } catch (err: unknown) {
      setOauthLoading(null);
      const message = err instanceof Error ? err.message : "Authentication request failed.";
      toast.error(message);
    }
  }

  const strength = calculatePasswordStrength(
    authMode === "update-password" ? newPassword : password,
  );

  return (
    <div className="dark min-h-screen bg-[#070913] text-foreground selection:bg-indigo-500/30 selection:text-white relative flex flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* ── Ambient Background System ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="grid-lines absolute inset-0 opacity-30" />
        <div
          className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-35 blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.25), rgba(6, 182, 212, 0.15), transparent 70%)",
          }}
        />
        <div className="absolute top-1/3 -left-36 h-80 w-80 rounded-full bg-cyan-600/10 blur-[100px]" />
        <div className="absolute bottom-1/4 -right-36 h-80 w-80 rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link
            to="/"
            className="transition-transform duration-200 hover:scale-105"
            aria-label="opteraOS Home"
          >
            <BrandLockup />
          </Link>
        </div>

        {/* Glassmorphic Auth Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d111d]/85 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: UPDATE PASSWORD (AFTER AUTHORIZATION / RECOVERY LINK)
             ───────────────────────────────────────────────────────────── */}
          {authMode === "update-password" ? (
            <div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-950/40 text-indigo-400 shadow-lg shadow-indigo-500/10">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Create New Password
                </h1>
                <p className="mt-1.5 text-xs text-slate-400">
                  Set a secure password for your opteraOS account.
                </p>
              </div>

              {passwordUpdated ? (
                <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 animate-pulse" />
                  <h3 className="mt-3 text-base font-semibold text-white">Password Updated!</h3>
                  <p className="mt-1.5 text-xs text-slate-300">
                    Your password has been changed. Redirecting to your workspace...
                  </p>
                  <Button
                    onClick={() => window.location.replace("/dashboard")}
                    className="mt-5 w-full bg-gradient-brand text-xs font-semibold text-white"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <form className="mt-6 grid gap-4" onSubmit={handleUpdatePassword}>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password" className="text-xs font-medium text-slate-300">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="h-11 rounded-xl border-white/10 bg-white/[0.03] pr-10 pl-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="mt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Strength:</span>
                          <span className="font-semibold text-slate-200">{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                strength.score >= level ? strength.color : "bg-white/10"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-xs font-medium text-slate-300"
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
                    className="mt-2 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.01] hover:opacity-95 hover:shadow-indigo-500/40"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Password
                  </Button>
                </form>
              )}
            </div>
          ) : authMode === "forgot" ? (
            /* ─────────────────────────────────────────────────────────────
                VIEW 2: FORGOT PASSWORD REQUEST
               ───────────────────────────────────────────────────────────── */
            <div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-950/40 text-indigo-400 shadow-lg shadow-indigo-500/10">
                  <Lock className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Reset Password
                </h1>
                <p className="mt-1.5 text-xs text-slate-400">
                  Enter your work email and we&apos;ll send you a password recovery link.
                </p>
              </div>

              {sentForgot ? (
                <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-5 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
                  <h3 className="mt-2 text-sm font-semibold text-white">Reset Link Sent</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    We sent password reset instructions to{" "}
                    <span className="font-medium text-white">{email}</span>. Click the link in your
                    email to create a new password.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSentForgot(false)}
                      className="border-white/10 bg-white/[0.04] text-xs text-white hover:bg-white/[0.08]"
                    >
                      Send again
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAuthMode("signin")}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ← Back to Sign in
                    </Button>
                  </div>
                </div>
              ) : (
                <form className="mt-6 grid gap-4" onSubmit={handleForgotPassword}>
                  <div className="grid gap-2">
                    <Label htmlFor="forgot-email" className="text-xs font-medium text-slate-300">
                      Work email
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.01] hover:opacity-95 hover:shadow-indigo-500/40"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Recovery
                    Link
                  </Button>

                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signin")}
                      className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
                    >
                      ← Back to Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
                VIEW 3: SIGN IN & CREATE ACCOUNT TABS + OAUTH PROVIDERS
               ───────────────────────────────────────────────────────────── */
            <div>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Welcome to opteraOS
                </h1>
                <p className="mt-2 text-sm text-slate-400">One system. Smarter business.</p>
              </div>

              {sentSignUp ? (
                <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-5 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
                  <h3 className="mt-2 text-sm font-semibold text-white">Check your email</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    We sent a confirmation link to verify your account. Once verified, you can sign in.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSentSignUp(false)}
                    className="mt-4 border-white/10 bg-white/[0.04] text-xs text-white hover:bg-white/[0.08]"
                  >
                    Back to Sign in
                  </Button>
                </div>
              ) : (
                <>
                  {/* Google OAuth Provider */}
                  <div className="mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!!oauthLoading || loading}
                      onClick={handleGoogleOAuth}
                      className="h-11 w-full border-white/10 bg-white/[0.04] font-medium text-white shadow-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                    >
                      {oauthLoading === "google" ? (
                        <Loader2 className="mr-2.5 h-4 w-4 animate-spin text-cyan-400" />
                      ) : (
                        <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      Continue with Google
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    <span className="h-px flex-1 bg-white/10" />
                    <span>or continue with email</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Tabs */}
                  <Tabs
                    value={authMode}
                    onValueChange={(v) => setAuthMode(v as AuthMode)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 rounded-xl border border-white/10 bg-black/40 p-1">
                      <TabsTrigger
                        value="signin"
                        className="rounded-lg text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        Sign in
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="rounded-lg text-xs font-semibold text-slate-400 transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm"
                      >
                        Create account
                      </TabsTrigger>
                    </TabsList>

                    {/* Sign In Form */}
                    <TabsContent value="signin" className="mt-4">
                      <form className="grid gap-4" onSubmit={signIn}>
                        <div className="grid gap-2">
                          <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                            Work email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                          />
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="password"
                              className="text-xs font-medium text-slate-300"
                            >
                              Password
                            </Label>
                            <button
                              type="button"
                              onClick={() => setAuthMode("forgot")}
                              className="text-xs text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter your password"
                              className="h-11 rounded-xl border-white/10 bg-white/[0.03] pr-10 pl-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading || !!oauthLoading}
                          className="mt-1 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.01] hover:opacity-95 hover:shadow-indigo-500/40"
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                        </Button>
                      </form>
                    </TabsContent>

                    {/* Create Account Form */}
                    <TabsContent value="signup" className="mt-4">
                      <form className="grid gap-4" onSubmit={signUp}>
                        <div className="grid gap-2">
                          <Label
                            htmlFor="signup-email"
                            className="text-xs font-medium text-slate-300"
                          >
                            Work email
                          </Label>
                          <Input
                            id="signup-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label
                            htmlFor="signup-password"
                            className="text-xs font-medium text-slate-300"
                          >
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              required
                              minLength={8}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="At least 8 characters"
                              className="h-11 rounded-xl border-white/10 bg-white/[0.03] pr-10 pl-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          {password && (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Password strength:</span>
                                <span className="font-semibold text-slate-200">{strength.label}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[1, 2, 3, 4].map((level) => (
                                  <div
                                    key={level}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      strength.score >= level ? strength.color : "bg-white/10"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={loading || !!oauthLoading}
                          className="mt-1 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.01] hover:opacity-95 hover:shadow-indigo-500/40"
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                          account
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  {/* Terms Note */}
                  <p className="mt-6 text-center text-xs text-slate-500">
                    By continuing, you agree to our{" "}
                    <Link
                      to="/terms"
                      className="text-slate-400 underline underline-offset-4 transition-colors hover:text-white"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-slate-400 underline underline-offset-4 transition-colors hover:text-white"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to opteraOS home
          </Link>
        </div>
      </div>
    </div>
  );
}
