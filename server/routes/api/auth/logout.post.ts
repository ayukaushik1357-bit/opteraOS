/**
 * Backend Logout Handler
 * Route: POST /api/auth/logout
 */
import { defineEventHandler, setCookie } from "h3";

export default defineEventHandler(async (event) => {
  setCookie(event, "optera_oauth_state", "", { maxAge: 0, path: "/" });
  setCookie(event, "optera_session", "", { maxAge: 0, path: "/" });

  return { success: true, message: "Logged out successfully" };
});
