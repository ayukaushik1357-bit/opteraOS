import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/callback")({
  component: GenericCallbackPage,
});

function GenericCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function handleCallback(): Promise<void> {
      try {
        if (typeof window === "undefined") return;

        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash || "";

        // 1. Check for OAuth errors
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

        // 2. Recovery check
        if (hash.includes("type=recovery") || searchParams.get("mode") === "recovery") {
          navigate({ to: "/auth", search: { mode: "recovery" } as Record<string, string>, replace: true });
          return;
        }

        // 3. PKCE code exchange
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (isMounted) {
              setStatus("error");
              setErrorMessage(error.message);
            }
            return;
          }

          if (data.session && isMounted) {
            setStatus("success");
            setTimeout(() => {
              window.location.replace("/dashboard");
            }, 600);
            return;
          }
        }

        // 4. Session check
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
            }, 600);
          }
          return;
        }

        // 5. Auth state change listener
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session && isMounted) {
            setStatus("success");
            setTimeout(() => {
              window.location.replace("/dashboard");
            }, 600);
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

    handleCallback();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="dark min-h-screen bg-[#070913] text-foreground flex flex-col items-center justify-center px-4 selection:bg-indigo-500/30 selection:text-white">
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <BrandLockup />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d111d]/90 p-8 backdrop-blur-2xl">
          {status === "processing" ? (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              <h2 className="mt-4 text-lg font-semibold text-white">Completing Sign In...</h2>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <h2 className="mt-4 text-xl font-bold text-white">Signed in!</h2>
              <p className="mt-2 text-xs text-slate-300">
                Opening your opteraOS workspace...
              </p>
              <Button
                onClick={() => window.location.replace("/dashboard")}
                className="mt-5 w-full bg-gradient-brand text-xs font-semibold text-white"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <h2 className="mt-4 text-lg font-semibold text-red-400">Authentication failed</h2>
              <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed">
                {errorMessage || "Unable to complete authentication."}
              </p>
              <Button
                onClick={() => window.location.replace("/auth")}
                className="mt-5 bg-white/10 text-xs text-white"
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
