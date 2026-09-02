import { BaseConnector, type ConnectorHealth } from "./base";
import type { ConnectorResult } from "../types";

export interface WhatsAppInput {
  to: string;
  message: string;
  templateName?: string | undefined;
  mediaUrl?: string | undefined;
}

export interface WhatsAppOutput {
  delivered: boolean;
  messageId: string;
  provider: string;
  recipient: string;
  sentAt: string;
}

export class WhatsAppConnector extends BaseConnector<any, WhatsAppInput, WhatsAppOutput> {
  readonly name = "WhatsAppConnector";
  readonly category = "communication";

  checkHealth(): ConnectorHealth {
    const metaToken = process.env["WHATSAPP_ACCESS_TOKEN"] || process.env["META_WHATSAPP_TOKEN"];
    const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
    const twilioSid = process.env["TWILIO_ACCOUNT_SID"];
    const twilioToken = process.env["TWILIO_AUTH_TOKEN"];

    if (metaToken && phoneId) {
      return {
        configured: true,
        provider: "Meta WhatsApp Cloud API",
        status: "connected",
        details: `Connected with Phone Number ID ${phoneId}`,
      };
    }
    if (twilioSid && twilioToken) {
      return {
        configured: true,
        provider: "Twilio WhatsApp",
        status: "connected",
        details: "Connected via Twilio REST API",
      };
    }

    return {
      configured: false,
      provider: null,
      status: "not_configured",
      details: "No WhatsApp credentials configured in .env (WHATSAPP_ACCESS_TOKEN / TWILIO_ACCOUNT_SID).",
    };
  }

  async execute(input: WhatsAppInput, orgConfig?: any, idempotencyKey?: string): Promise<ConnectorResult<WhatsAppOutput>> {
    const startTime = Date.now();
    const health = this.checkHealth();

    if (!health.configured || !health.provider) {
      return this.createBlockedResult(
        "WhatsApp",
        "WhatsApp Business integration is NOT configured. Provide WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID to enable real WhatsApp delivery.",
      );
    }

    // Clean phone number (strip spaces, dashes, ensure + or country code)
    const formattedPhone = input.to.replace(/[^\d+]/g, "");

    // ── 1. Meta WhatsApp Cloud API ───────────────────────────────────────────
    if (health.provider === "Meta WhatsApp Cloud API") {
      const metaToken = (process.env["WHATSAPP_ACCESS_TOKEN"] || process.env["META_WHATSAPP_TOKEN"])!;
      const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"]!;

      try {
        const body = input.templateName
          ? {
              messaging_product: "whatsapp",
              to: formattedPhone,
              type: "template",
              template: {
                name: input.templateName,
                language: { code: "en_US" },
              },
            }
          : {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: formattedPhone,
              type: "text",
              text: { body: input.message },
            };

        const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return this.createFailedResult(
            "Meta WhatsApp Cloud API",
            new Error(`Meta API error (${res.status}): ${JSON.stringify(errData)}`),
            durationMs,
            res.status,
          );
        }

        const data = await res.json();
        const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;

        return this.createSuccessResult(
          "Meta WhatsApp Cloud API",
          messageId,
          {
            delivered: true,
            messageId,
            provider: "Meta WhatsApp Cloud API",
            recipient: formattedPhone,
            sentAt: new Date().toISOString(),
          },
          durationMs,
          data,
        );
      } catch (err: any) {
        return this.createFailedResult("Meta WhatsApp Cloud API", err, Date.now() - startTime);
      }
    }

    // ── 2. Twilio WhatsApp ───────────────────────────────────────────────────
    if (health.provider === "Twilio WhatsApp") {
      const sid = process.env["TWILIO_ACCOUNT_SID"]!;
      const token = process.env["TWILIO_AUTH_TOKEN"]!;
      const fromNumber = process.env["TWILIO_WHATSAPP_FROM"] || "whatsapp:+14155238886";

      try {
        const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
        const formParams = new URLSearchParams();
        formParams.append("From", fromNumber);
        formParams.append("To", `whatsapp:${formattedPhone}`);
        formParams.append("Body", input.message);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formParams.toString(),
        });

        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          const errText = await res.text();
          return this.createFailedResult("Twilio WhatsApp", new Error(`Twilio HTTP ${res.status}: ${errText}`), durationMs, res.status);
        }

        const data = await res.json();
        const messageId = data.sid || `twilio_${Date.now()}`;

        return this.createSuccessResult(
          "Twilio WhatsApp",
          messageId,
          {
            delivered: true,
            messageId,
            provider: "Twilio WhatsApp",
            recipient: formattedPhone,
            sentAt: new Date().toISOString(),
          },
          durationMs,
          data,
        );
      } catch (err: any) {
        return this.createFailedResult("Twilio WhatsApp", err, Date.now() - startTime);
      }
    }

    return this.createBlockedResult("WhatsApp", "Unsupported WhatsApp provider.");
  }
}

export const whatsAppConnector = new WhatsAppConnector();
