/**
 * Backend Apple OAuth Initiation Handler
 * Route: GET /api/auth/apple
 */
import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  const clientId = process.env["APPLE_CLIENT_ID"];

  if (!clientId) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Apple Sign-In Configuration — opteraOS</title>
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
          <h2>Apple OAuth Setup Required</h2>
          <p>Apple Sign-In is not yet configured on the opteraOS backend.</p>
          <div class="code">
            Required backend environment variables:<br>
            • APPLE_CLIENT_ID (Services ID)<br>
            • APPLE_TEAM_ID<br>
            • APPLE_KEY_ID<br>
            • APPLE_PRIVATE_KEY
          </div>
          <a href="/auth">Back to Sign in</a>
        </div>
      </body>
      </html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Apple OAuth URL redirect when credentials are configured
  const redirectUri = `${process.env["APP_URL"] || "http://localhost:8080"}/api/auth/apple/callback`;
  const state = Math.random().toString(36).substring(2);
  const appleUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post&state=${state}`;

  return Response.redirect(appleUrl, 302);
});
