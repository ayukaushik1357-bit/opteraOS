/**
 * Backend Google OAuth Initiation Handler
 * Route: GET /api/auth/google
 */
import { defineEventHandler, sendRedirect, setCookie, getRequestURL } from "h3";
import { OAuthService } from "@optera/server/auth";

export default defineEventHandler(async (event) => {
  try {
    const url = getRequestURL(event);
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // Generate random cryptographic state for CSRF defense
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

    // Save state in HTTP-only secure cookie
    setCookie(event, "optera_oauth_state", state, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const { url: googleAuthUrl } = OAuthService.getGoogleAuthUrl(state, redirectUri);
    return sendRedirect(event, googleAuthUrl, 302);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Google OAuth configuration error";
    // Return friendly HTML error page rather than cryptic raw 400
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Google Sign-In Configuration — opteraOS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { background: #070913; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #0d111d; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          h2 { color: #f87171; margin-top: 0; font-size: 20px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          .code { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #38bdf8; word-break: break-all; margin: 16px 0; text-align: left; }
          a { display: inline-block; margin-top: 16px; background: rgba(255,255,255,0.1); color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; }
          a:hover { background: rgba(255,255,255,0.18); }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Google OAuth Setup Required</h2>
          <p>${message}</p>
          <div class="code">
            Required backend environment variables:<br>
            • GOOGLE_CLIENT_ID<br>
            • GOOGLE_CLIENT_SECRET
          </div>
          <a href="/auth">Back to Sign in</a>
        </div>
      </body>
      </html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
});
