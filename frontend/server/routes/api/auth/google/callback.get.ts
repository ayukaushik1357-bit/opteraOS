/**
 * Backend Google OAuth Callback Handler
 * Route: GET /api/auth/google/callback
 */
import { defineEventHandler, getQuery, getCookie, setCookie, sendRedirect, getRequestURL } from "h3";
import { OAuthService } from "@optera/server/auth";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const query = getQuery(event);

  const error = query["error"] as string | undefined;
  const errorDescription = query["error_description"] as string | undefined;

  if (error) {
    const errorMsg = encodeURIComponent(errorDescription || error || "Google login was cancelled.");
    return sendRedirect(event, `/auth?error=${errorMsg}`, 302);
  }

  const code = query["code"] as string | undefined;
  const state = query["state"] as string | undefined;
  const savedState = getCookie(event, "optera_oauth_state");

  // Validate state to protect against CSRF attacks
  if (!state || !savedState || state !== savedState) {
    const errorMsg = encodeURIComponent("OAuth state validation failed (possible CSRF attack).");
    return sendRedirect(event, `/auth?error=${errorMsg}`, 302);
  }

  // Clear state cookie
  setCookie(event, "optera_oauth_state", "", { maxAge: 0, path: "/" });

  if (!code) {
    const errorMsg = encodeURIComponent("No authorization code provided by Google.");
    return sendRedirect(event, `/auth?error=${errorMsg}`, 302);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // 1. Exchange authorization code with Google and retrieve user identity
    const profile = await OAuthService.handleGoogleCallback(code, redirectUri);

    // 2. Provision / resolve user and organization in opteraOS database
    const { sessionUrl } = await OAuthService.resolveAndProvisionUser(profile);

    // 3. Redirect browser to session establishment link
    return sendRedirect(event, sessionUrl, 302);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication processing failed.";
    const errorMsg = encodeURIComponent(message);
    return sendRedirect(event, `/auth?error=${errorMsg}`, 302);
  }
});
