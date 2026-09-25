/**
 * opteraOS — Centralized Email Service
 * 
 * Supports:
 * - Resend API (via RESEND_API_KEY)
 * - SMTP (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * - SendGrid API (via SENDGRID_API_KEY)
 * 
 * Behavior:
 * - If provider is configured: transmits real email, records provider message ID.
 * - If provider is NOT configured: returns structured EMAIL_PROVIDER_NOT_CONFIGURED error code.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: "Resend" | "SMTP" | "SendGrid" | null;
  error?: string;
  errorCode?: "EMAIL_PROVIDER_NOT_CONFIGURED" | "EMAIL_SEND_FAILED" | "INVALID_RECIPIENT";
  deliveredAt?: string;
}

export class EmailService {
  private static defaultFrom = process.env["EMAIL_FROM"] || "opteraOS <notifications@opteraos.com>";

  public static getProviderStatus(): { configured: boolean; provider: "Resend" | "SMTP" | "SendGrid" | null } {
    if (process.env["RESEND_API_KEY"]) return { configured: true, provider: "Resend" };
    if (process.env["SENDGRID_API_KEY"]) return { configured: true, provider: "SendGrid" };
    if (process.env["SMTP_HOST"] && process.env["SMTP_USER"]) return { configured: true, provider: "SMTP" };
    return { configured: false, provider: null };
  }

  public static async send(payload: EmailPayload): Promise<EmailSendResult> {
    const { configured, provider } = this.getProviderStatus();

    if (!configured || !provider) {
      return {
        success: false,
        provider: null,
        errorCode: "EMAIL_PROVIDER_NOT_CONFIGURED",
        error: "EMAIL_PROVIDER_NOT_CONFIGURED: No external email provider found in environment. Please define RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST in .env.",
      };
    }

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const fromAddress = payload.from || this.defaultFrom;

    try {
      // 1. Resend API
      if (provider === "Resend") {
        const apiKey = process.env["RESEND_API_KEY"];
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: recipients,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            reply_to: payload.replyTo,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody as any)?.message || `Resend Error HTTP ${res.status}`);
        }

        const data = await res.json();
        return {
          success: true,
          provider: "Resend",
          messageId: data.id,
          deliveredAt: new Date().toISOString(),
        };
      }

      // 2. SendGrid API
      if (provider === "SendGrid") {
        const apiKey = process.env["SENDGRID_API_KEY"];
        const rawEmail = fromAddress.includes("<")
          ? (fromAddress.split("<")[1]?.replace(">", "").trim() || fromAddress)
          : fromAddress;

        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: recipients.map((r) => ({ email: r })) }],
            from: { email: rawEmail },
            subject: payload.subject,
            content: [{ type: "text/html", value: payload.html }],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          throw new Error(errBody || `SendGrid Error HTTP ${res.status}`);
        }

        const messageId = res.headers.get("x-message-id") || `sg_${Date.now()}`;
        return {
          success: true,
          provider: "SendGrid",
          messageId,
          deliveredAt: new Date().toISOString(),
        };
      }

      // 3. SMTP via Nodemailer
      if (provider === "SMTP") {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env["SMTP_HOST"],
          port: Number(process.env["SMTP_PORT"] || 587),
          secure: process.env["SMTP_SECURE"] === "true",
          auth: {
            user: process.env["SMTP_USER"],
            pass: process.env["SMTP_PASS"],
          },
        });

        const info = await transporter.sendMail({
          from: fromAddress,
          to: recipients.join(", "),
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          replyTo: payload.replyTo,
        });

        return {
          success: true,
          provider: "SMTP",
          messageId: info.messageId,
          deliveredAt: new Date().toISOString(),
        };
      }

      throw new Error("Unknown provider configuration");
    } catch (err: any) {
      console.error("[optera EmailService] Transmission failed:", err.message);
      return {
        success: false,
        provider,
        errorCode: "EMAIL_SEND_FAILED",
        error: `EMAIL_SEND_FAILED: ${err.message}`,
      };
    }
  }
}
