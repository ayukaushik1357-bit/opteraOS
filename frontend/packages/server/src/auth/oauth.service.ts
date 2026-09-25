import { supabaseAdmin } from "../db/client.server";

export interface OAuthUserProfile {
  email: string;
  name?: string | undefined;
  avatarUrl?: string | undefined;
  provider: "google" | "apple";
  providerId: string;
}

export class OAuthService {
  /**
   * Generates the Google OAuth authorization URL.
   */
  static getGoogleAuthUrl(state: string, redirectUri: string): { url: string } {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    if (!clientId) {
      throw new Error(
        "Google OAuth is not configured on the opteraOS backend. Please define GOOGLE_CLIENT_ID in your server environment.",
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  /**
   * Exchanges Google authorization code for tokens and fetches user profile.
   */
  static async handleGoogleCallback(
    code: string,
    redirectUri: string,
  ): Promise<OAuthUserProfile> {
    const clientId = process.env["GOOGLE_CLIENT_ID"];
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      throw new Error(
        "Google OAuth credentials missing on backend. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      );
    }

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${errBody}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string; id_token?: string };

    // 2. Fetch user information from Google API
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to retrieve user profile from Google.");
    }

    const userInfo = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!userInfo.email) {
      throw new Error("No verified email returned from Google account.");
    }

    return {
      email: userInfo.email.toLowerCase().trim(),
      name: userInfo.name || userInfo.email.split("@")[0],
      avatarUrl: userInfo.picture,
      provider: "google",
      providerId: userInfo.sub,
    };
  }

  /**
   * Resolves or provisions an opteraOS user and organization membership in the database.
   */
  static async resolveAndProvisionUser(profile: OAuthUserProfile): Promise<{
    user: { id: string; email: string };
    sessionUrl: string;
    organization: { id: string; name: string } | null;
  }> {
    let userId: string | null = null;

    // 1. Look up or create user in Supabase Auth via Admin client
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: {
        full_name: profile.name,
        avatar_url: profile.avatarUrl,
        provider: profile.provider,
      },
    });

    if (createdUser?.user) {
      userId = createdUser.user.id;
    } else if (createError) {
      // User might already exist; query user by email
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = userList?.users?.find((u) => u.email?.toLowerCase() === profile.email.toLowerCase());
      if (existing) {
        userId = existing.id;
      } else {
        throw new Error(`Could not resolve user account: ${createError.message}`);
      }
    }

    if (!userId) {
      throw new Error("Failed to establish user identity in database.");
    }

    // 2. Resolve organization membership
    const { data: memberships } = await supabaseAdmin
      .from("organization_members")
      .select("org_id, organizations(id, name, slug)")
      .eq("user_id", userId);

    let organization: { id: string; name: string } | null = null;

    if (memberships && memberships.length > 0 && memberships[0]?.organizations) {
      const org = memberships[0].organizations as { id: string; name: string };
      organization = { id: org.id, name: org.name };
    } else {
      // Create initial workspace for new user
      const orgName = `${profile.name || "My"}'s Workspace`;
      const baseSlug = (profile.name || "workspace")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

      const { data: newOrg } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: orgName,
          slug,
          owner_id: userId,
          currency: "INR",
        })
        .select("id, name")
        .single();

      if (newOrg) {
        organization = { id: newOrg.id, name: newOrg.name };
      }
    }

    // 3. Generate authenticated session link for seamless client-side transition
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error("Failed to generate application session tokens.");
    }

    return {
      user: { id: userId, email: profile.email },
      sessionUrl: linkData.properties.action_link,
      organization,
    };
  }
}
