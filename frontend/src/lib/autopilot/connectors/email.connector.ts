import { BaseConnector, type ConnectorHealth } from "./base";
import type { ConnectorResult } from "../types";

export interface EmailInput {
  to: string;
  subject: string;
  content: string;
  html?: string | undefined;
  from?: string | undefined;
  replyTo?: string | undefined;
}

export interface EmailOutput {
  delivered: boolean;
  messageId: string;
  provider: string;
  recipient: string;
  sentAt: string;
}

export class EmailConnector extends BaseConnector<any, EmailInput, EmailOutput> {
  readonly name = "EmailConnector";
  readonly category = "communication";

  checkHealth(): ConnectorHealth {
    const resendKey = process.env["RESEND_API_KEY"];
    const sendgridKey = process.env["SENDGRID_API_KEY"];
    const smtpHost = process.env["SMTP_HOST"];
    const smtpUser = process.env["SMTP_USER"];

    if (resendKey) {
      return {
        configured: true,
        provider: "Resend",
        status: "connected",
        details: "Connected via Resend REST API",
      };
    }
    if (sendgridKey) {
      return {
        configured: true,
        provider: "SendGrid",
        status: "connected",
        details: "Connected via SendGrid v3 API",
      };
    }
    if (smtpHost && smtpUser) {
      return {
        configured: true,
        provider: "SMTP",
        status: "connected",
        details: `Connected via SMTP (${smtpHost})`,
      };
    }

    return {
      configured: false,
      provider: null,
      status: "not_configured",
      details: "No email provider credentials found in .env (RESEND_API_KEY / SENDGRID_API_KEY / SMTP_HOST).",
    };
  }

  async execute(input: EmailInput, orgConfig?: any, idempotencyKey?: string): Promise<ConnectorResult<EmailOutput>> {
    const startTime = Date.now();
    const health = this.checkHealth();

    if (!health.configured || !health.provider) {
      return this.createBlockedResult(
        "Email",
        "No email provider is configured in the environment (RESEND_API_KEY / SENDGRID_API_KEY / SMTP). Email delivery is blocked to prevent mock execution.",
      );
    }

    const fromAddress = input.from || process.env["DEFAULT_FROM_EMAIL"] || "opteraOS <notifications@optera.ai>";

    // ── 1. Resend API ────────────────────────────────────────────────────────
    if (health.provider === "Resend") {
      const apiKey = process.env["RESEND_API_KEY"]!;
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (idempotencyKey) {
          headers["Idempotency-Key"] = idempotencyKey;
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers,
          body: JSON.stringify({
            from: fromAddress,
            to: [input.to],
            subject: input.subject,
            text: input.content,
            html: input.html || `<p>${input.content.replace(/\n/g, "<br/>")}</p>`,
            reply_to: input.replyTo,
          }),
        });

        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          const errText = await res.text();
          return this.createFailedResult(
            "Resend",
            new Error(`Resend API HTTP ${res.status}: ${errText}`),
            durationMs,
            res.status,
          );
        }

        const data = await res.json();
        const messageId = data.id || `resend_${Date.now()}`;

        return this.createSuccessResult(
          "Resend",
          messageId,
          {
            delivered: true,
            messageId,
            provider: "Resend",
            recipient: input.to,
            sentAt: new Date().toISOString(),
          },
          durationMs,
          data,
        );
      } catch (err: any) {
        return this.createFailedResult("Resend", err, Date.now() - startTime);
      }
    }

    // ── 2. SendGrid API ──────────────────────────────────────────────────────
    if (health.provider === "SendGrid") {
      const apiKey = process.env["SENDGRID_API_KEY"]!;
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: input.to }] }],
            from: { email: fromAddress.includes("<") ? fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress : fromAddress },
            subject: input.subject,
            content: [
              { type: "text/plain", value: input.content },
              ...(input.html ? [{ type: "text/html", value: input.html }] : []),
            ],
          }),
        });

        const durationMs = Date.now() - startTime;

        if (res.status >= 200 && res.status < 300) {
          const messageId = res.headers.get("x-message-id") || `sg_${Date.now()}`;
          return this.createSuccessResult(
            "SendGrid",
            messageId,
            {
              delivered: true,
              messageId,
              provider: "SendGrid",
              recipient: input.to,
              sentAt: new Date().toISOString(),
            },
            durationMs,
          );
        }

        const errText = await res.text();
        return this.createFailedResult(
          "SendGrid",
          new Error(`SendGrid API HTTP ${res.status}: ${errText}`),
          durationMs,
          res.status,
        );
      } catch (err: any) {
        return this.createFailedResult("SendGrid", err, Date.now() - startTime);
      }
    }

    // ── 3. SMTP Fallback via Nodemailer / Socket ──────────────────────────────
    if (health.provider === "SMTP") {
      try {
        // Dynamic import nodemailer if present
        let nodemailer: any;
        try {
          nodemailer = await import("nodemailer");
        } catch {
          // Nodemailer module not installed in this runtime
        }

        if (nodemailer && (nodemailer.createTransport || nodemailer.default?.createTransport)) {
          const createTransport = nodemailer.createTransport || nodemailer.default.createTransport;
          const transporter = createTransport({
            host: process.env["SMTP_HOST"],
            port: Number(process.env["SMTP_PORT"] || 587),
            secure: process.env["SMTP_SECURE"] === "true",
            auth: {
              user: process.env["SMTP_USER"],
              pass: process.env["SMTP_PASS"] || process.env["SMTP_PASSWORD"],
            },
          });

          const info = await transporter.sendMail({
            from: fromAddress,
            to: input.to,
            subject: input.subject,
            text: input.content,
            html: input.html || `<p>${input.content.replace(/\n/g, "<br/>")}</p>`,
          });

          const durationMs = Date.now() - startTime;
          const messageId = info.messageId || `smtp_${Date.now()}`;

          return this.createSuccessResult(
            "SMTP",
            messageId,
            {
              delivered: true,
              messageId,
              provider: "SMTP",
              recipient: input.to,
              sentAt: new Date().toISOString(),
            },
            durationMs,
            info,
          );
        }

        return this.createBlockedResult(
          "SMTP",
          "SMTP driver unavailable in server runtime. Please configure RESEND_API_KEY in .env.",
        );
      } catch (err: any) {
        return this.createFailedResult("SMTP", err, Date.now() - startTime);
      }
    }

    return this.createBlockedResult("Email", "No supported email provider configured.");
  }
}

export const emailConnector = new EmailConnector();
