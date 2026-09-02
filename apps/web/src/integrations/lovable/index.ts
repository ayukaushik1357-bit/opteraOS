import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      const targetProvider = provider === "lovable" ? "google" : (provider as "google" | "apple");
      const options: { redirectTo?: string; queryParams?: Record<string, string> } = {
        redirectTo: opts?.redirect_uri || `${window.location.origin}/dashboard`,
      };
      if (opts?.extraParams) {
        options.queryParams = opts.extraParams;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: targetProvider,
        options,
      });

      if (error) {
        return { error };
      }

      if (data?.url) {
        window.location.href = data.url;
        return { error: null, redirected: true };
      }

      return { error: null, redirected: false };
    },
  },
};
