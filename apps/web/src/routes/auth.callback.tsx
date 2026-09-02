import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { exchangeGoogleOAuthCode } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const exchangeCode = useServerFn(exchangeGoogleOAuthCode);
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function handleAuthCallback(): Promise<void> {
      try {
        if (typeof window === "undefined") return;

        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash || "";

        // 1. Check for OAuth errors in query string or hash
        const urlError = searchParams.get("error") || searchParams.get("error_description");
        const hashErrorMatch = hash.match(/error_description=([^&]+)/) || hash.match(/error=([^&]+)/);
        const hashError = hashErrorMatch?.[1] ? decodeURIComponent(hashErrorMatch[1].replace(/\+/g, " ")) : null;

        if (urlError || hashError) {
          if (isMounted) {
            setStatus("error");
            setErrorMessage(urlError || hashError || "Authentication was denied or cancelled.");
          }
          return;
        }

        // 2. Check for password recovery flow
        if (hash.includes("type=recovery") || searchParams.get("mode") === "recovery") {
          navigate({ to: "/auth", search: { mode: "recovery" } as Record<string, string>, replace: true });
          return;
        }

        // 3. opteraOS Backend Server-Side Code Exchange & State Validation
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const savedState = sessionStorage.getItem("optera_oauth_state");

        if (savedState && state && state !== savedState) {
          if (isMounted) {
            setStatus("error");
            setErrorMessage("OAuth state mismatch detected (possible CSRF attempt).");
          }
          return;
        }
        sessionStorage.removeItem("optera_oauth_state");

        if (code) {
          const redirectUri = `${window.location.origin}/auth/callback`;
          const res = await exchangeCode({ data: { code, redirectUri } });

          if (!res.success || !res.sessionUrl) {
            if (isMounted) {
              setStatus("error");
              setErrorMessage(res.error || "Authentication failed on backend.");
            }
            return;
          }

          if (isMounted) {
            setStatus("success");
            setTimeout(() => {
              window.location.replace(res.sessionUrl);
            }, 500);
            return;
          }
        }

        // 4. Check for existing session or hash session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          if (isMounted) {
            setStatus("error");
            setErrorMessage(sessionError.message);
          }
          return;
        }

        if (sessionData.session) {
          if (isMounted) {
            setStatus("success");
            setTimeout(() => {
              window.location.replace("/dashboard");
            }, 500);
          }
          return;
        }

        // 5. Fallback onAuthStateChange listener
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session && isMounted) {
            setStatus("success");
            setTimeout(() => {
              window.location.replace("/dashboard");
            }, 500);
          }
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch (err: unknown) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred during authentication.");
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [exchangeCode, navigate]);

  return (
    <div className="dark min-h-screen bg-[#070913] text-foreground flex flex-col items-center justify-center px-4 selection:bg-indigo-500/30 selection:text-white">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="grid-lines absolute inset-0 opacity-30" />
        <div
          className="absolute -top-32 left-1/2 h-[450px] w-[700px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4), rgba(6, 182, 212, 0.2), transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <BrandLockup />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d111d]/90 p-8 shadow-2xl backdrop-blur-2xl">
          {status === "processing" ? (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              <h2 className="mt-4 text-lg font-semibold text-white">Completing Sign In...</h2>
              <p className="mt-1.5 text-xs text-slate-400">
                Establishing secure session with opteraOS backend.
              </p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">Authenticated!</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Opening your opteraOS workspace...
              </p>
              <Button
                onClick={() => window.location.replace("/dashboard")}
                className="mt-5 w-full bg-gradient-brand text-xs font-semibold text-white"
              >
                Continue to Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-950/40 text-red-400 shadow-lg shadow-red-500/10">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">Authentication Failed</h2>
              <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed">
                {errorMessage || "Unable to complete authentication with provider."}
              </p>
              <Button
                onClick={() => window.location.replace("/auth")}
                className="mt-6 w-full border border-white/10 bg-white/[0.05] text-xs font-medium text-white hover:bg-white/[0.1]"
              >
                Back to Sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
