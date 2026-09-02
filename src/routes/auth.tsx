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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { initiateGoogleOAuth } from "@/lib/auth.functions";
import { authApi } from "@/lib/api";

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
  if (!pass) return { score: 0, label: "", color: "bg-gray-200" };
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

  // Sign In with password (REST API + Supabase fallback)
  async function signIn(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Try custom NestJS REST API
      const res = await authApi.login({ email, password });
      setLoading(false);
      toast.success("Welcome back to opteraOS!");
      window.location.replace("/dashboard");
      return;
    } catch (apiErr: any) {
      // 2. Fallback to Supabase if API not reachable
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(apiErr?.message || error.message);
        return;
      }
      window.location.replace("/dashboard");
    }
  }

  // Create account (REST API + Supabase fallback)
  async function signUp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Try custom NestJS REST API
      const res = await authApi.register({
        firstName: email.split("@")[0] || "User",
        lastName: "Member",
        email,
        password,
      });
      setLoading(false);
      toast.success("Account created successfully!");
      if (res.accessToken) {
        window.location.replace("/dashboard");
        return;
      }
      setSentSignUp(true);
      return;
    } catch (apiErr: any) {
      // 2. Fallback to Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) {
        toast.error(apiErr?.message || error.message);
        return;
      }
      if (data.session) {
        window.location.replace("/dashboard");
        return;
      }
      setSentSignUp(true);
    }
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

  // Google OAuth Handshake
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
    <div className="min-h-screen text-[#111827] relative flex flex-col items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="opteraOS Home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white text-lg font-bold shadow-xs">
              O
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#111827]">
              optera<span className="text-blue-600">OS</span>
            </span>
          </Link>
        </div>

        {/* Clean Auth Card */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8">
          {/* ─────────────────────────────────────────────────────────────
              VIEW 1: UPDATE PASSWORD (AFTER AUTHORIZATION / RECOVERY LINK)
             ───────────────────────────────────────────────────────────── */}
          {authMode === "update-password" ? (
            <div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
                  Create New Password
                </h1>
                <p className="mt-1.5 text-sm text-[#4B5563]">
                  Set a secure password for your opteraOS account.
                </p>
              </div>

              {passwordUpdated ? (
                <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                  <h3 className="mt-3 text-sm font-bold text-green-900">Password Updated!</h3>
                  <p className="mt-1.5 text-xs text-green-700">
                    Your password has been changed. Redirecting to your workspace...
                  </p>
                  <Button
                    onClick={() => window.location.replace("/dashboard")}
                    className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <form className="mt-6 grid gap-4" onSubmit={handleUpdatePassword}>
                  <div className="grid gap-1.5">
                    <Label htmlFor="new-password" className="text-sm font-medium text-[#374151]">
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
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
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
                          <span className="text-gray-500 font-medium">Strength:</span>
                          <span className="font-semibold text-gray-700">{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                strength.score >= level ? strength.color : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="confirm-password"
                      className="text-sm font-medium text-[#374151]"
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
                      className="h-10"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs font-medium text-red-600">Passwords do not match</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
                    className="mt-2 h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Lock className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
                  Reset Password
                </h1>
                <p className="mt-1.5 text-sm text-[#4B5563]">
                  Enter your work email and we&apos;ll send you a password recovery link.
                </p>
              </div>

              {sentForgot ? (
                <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-green-600" />
                  <h3 className="mt-2 text-sm font-bold text-green-900">Reset Link Sent</h3>
                  <p className="mt-1 text-sm leading-relaxed text-green-800">
                    We sent password reset instructions to{" "}
                    <span className="font-semibold text-green-900">{email}</span>. Click the link in your
                    email to create a new password.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSentForgot(false)}
                      className="bg-white"
                    >
                      Send again
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAuthMode("signin")}
                      className="text-xs text-[#4B5563] hover:text-[#111827]"
                    >
                      ← Back to Sign in
                    </Button>
                  </div>
                </div>
              ) : (
                <form className="mt-6 grid gap-4" onSubmit={handleForgotPassword}>
                  <div className="grid gap-1.5">
                    <Label htmlFor="forgot-email" className="text-sm font-medium text-[#374151]">
                      Work email
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Recovery Link
                  </Button>

                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode("signin")}
                      className="text-xs font-semibold text-[#4B5563] transition-colors hover:text-[#111827] cursor-pointer"
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
                <h1 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
                  Welcome to opteraOS
                </h1>
                <p className="mt-1.5 text-sm text-[#4B5563]">AI Business Operating System</p>
              </div>

              {sentSignUp ? (
                <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-green-600" />
                  <h3 className="mt-2 text-sm font-bold text-green-900">Check your email</h3>
                  <p className="mt-1 text-sm leading-relaxed text-green-800">
                    We sent a confirmation link to verify your account. Once verified, you can sign in.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSentSignUp(false)}
                    className="mt-4 bg-white"
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
                      className="h-10 w-full font-semibold text-[#374151] border-[#CBD5E1] bg-white hover:bg-gray-50 shadow-xs"
                    >
                      {oauthLoading === "google" ? (
                        <Loader2 className="mr-2.5 h-4 w-4 animate-spin text-blue-600" />
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
                  <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    <span className="h-px flex-1 bg-[#E2E8F0]" />
                    <span>or continue with email</span>
                    <span className="h-px flex-1 bg-[#E2E8F0]" />
                  </div>

                  {/* Tabs */}
                  <Tabs
                    value={authMode}
                    onValueChange={(v) => setAuthMode(v as AuthMode)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1">
                      <TabsTrigger
                        value="signin"
                        className="rounded-md text-xs font-semibold text-[#4B5563] transition-all data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-xs cursor-pointer"
                      >
                        Sign in
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        className="rounded-md text-xs font-semibold text-[#4B5563] transition-all data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-xs cursor-pointer"
                      >
                        Create account
                      </TabsTrigger>
                    </TabsList>

                    {/* Sign In Form */}
                    <TabsContent value="signin" className="mt-4">
                      <form className="grid gap-4" onSubmit={signIn}>
                        <div className="grid gap-1.5">
                          <Label htmlFor="email" className="text-sm font-medium text-[#374151]">
                            Work email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="h-10"
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="password"
                              className="text-sm font-medium text-[#374151]"
                            >
                              Password
                            </Label>
                            <button
                              type="button"
                              onClick={() => setAuthMode("forgot")}
                              className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline cursor-pointer"
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
                              className="h-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
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
                          className="mt-1 h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                        </Button>
                      </form>
                    </TabsContent>

                    {/* Create Account Form */}
                    <TabsContent value="signup" className="mt-4">
                      <form className="grid gap-4" onSubmit={signUp}>
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor="signup-email"
                            className="text-sm font-medium text-[#374151]"
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
                            className="h-10"
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label
                            htmlFor="signup-password"
                            className="text-sm font-medium text-[#374151]"
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
                              className="h-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
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
                                <span className="text-gray-500 font-medium">Password strength:</span>
                                <span className="font-semibold text-gray-700">{strength.label}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[1, 2, 3, 4].map((level) => (
                                  <div
                                    key={level}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      strength.score >= level ? strength.color : "bg-gray-200"
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
                          className="mt-1 h-10 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  {/* Terms Note */}
                  <p className="mt-5 text-center text-xs text-[#6B7280]">
                    By continuing, you agree to our{" "}
                    <Link
                      to="/terms"
                      className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B5563] transition-colors hover:text-[#111827]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to opteraOS home
          </Link>
        </div>
      </div>
    </div>
  );
}
