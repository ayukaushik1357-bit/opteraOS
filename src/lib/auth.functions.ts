import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { OAuthService } from "@optera/server/auth";

/**
 * Server Function: Initiates Google OAuth on the opteraOS Backend.
 * Reads server-only credentials (GOOGLE_CLIENT_ID) and generates the Google OAuth URL.
 */
export const initiateGoogleOAuth = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        redirectUri: z.string().url(),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true; url: string; state?: string } | { success: false; error: string }> => {
      const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
      try {
        const { url } = OAuthService.getGoogleAuthUrl(state, data.redirectUri);
        return { success: true, url, state };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Google OAuth is not configured on the backend.";
        return { success: false, error: message };
      }
    },
  );

/**
 * Server Function: Handles Google OAuth authorization code exchange on the opteraOS Backend.
 * Exchanges the code with Google, provisions/resolves the user & workspace, and returns the authenticated session URL.
 */
export const exchangeGoogleOAuthCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z.string().min(1),
        redirectUri: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      // 1. Exchange code with Google
      const profile = await OAuthService.handleGoogleCallback(data.code, data.redirectUri);

      // 2. Provision user and workspace in database
      const result = await OAuthService.resolveAndProvisionUser(profile);

      return {
        success: true,
        user: result.user,
        sessionUrl: result.sessionUrl,
        organization: result.organization,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google authentication failed on backend.";
      return { success: false, error: message };
    }
  });

/**
 * Server Function: Initiates Apple OAuth on the opteraOS Backend.
 */
export const initiateAppleOAuth = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        redirectUri: z.string().url(),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true; url: string } | { success: false; error: string }> => {
      const clientId = process.env["APPLE_CLIENT_ID"];
      if (!clientId) {
        return {
          success: false,
          error:
            "Apple OAuth is not configured on the opteraOS backend. Please set APPLE_CLIENT_ID, APPLE_TEAM_ID, and APPLE_KEY_ID.",
        };
      }
      const state = Math.random().toString(36).substring(2);
      const appleUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(data.redirectUri)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post&state=${state}`;
      return {
        success: true,
        url: appleUrl,
      };
    },
  );
