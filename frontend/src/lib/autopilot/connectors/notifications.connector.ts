import { BaseConnector, type ConnectorHealth } from "./base";
import type { ConnectorResult } from "../types";

export interface NotificationInput {
  channel?: "slack" | "webhook" | "in_app" | undefined;
  title: string;
  message: string;
  recipientUserId?: string | undefined;
  orgId: string;
  supabase?: any;
  webhookUrl?: string | undefined;
  metadata?: Record<string, any> | undefined;
}

export interface NotificationOutput {
  delivered: boolean;
  channel: string;
  notificationId: string;
  provider: string;
  deliveredAt: string;
}

export class NotificationsConnector extends BaseConnector<any, NotificationInput, NotificationOutput> {
  readonly name = "NotificationsConnector";
  readonly category = "communication";

  checkHealth(): ConnectorHealth {
    const slackUrl = process.env["SLACK_WEBHOOK_URL"];
    if (slackUrl) {
      return {
        configured: true,
        provider: "Slack Webhook",
        status: "connected",
        details: "Slack Webhook Notifications Configured",
      };
    }

    return {
      configured: true,
      provider: "opteraOS In-App Notifications",
      status: "connected",
      details: "In-App Notification Dispatcher",
    };
  }

  async execute(input: NotificationInput): Promise<ConnectorResult<NotificationOutput>> {
    const startTime = Date.now();
    const { channel, title, message, webhookUrl, orgId, supabase, recipientUserId } = input;

    // ── 1. Slack Channel ─────────────────────────────────────────────────────
    if (channel === "slack") {
      const url = webhookUrl || process.env["SLACK_WEBHOOK_URL"];
      if (!url) {
        return this.createBlockedResult("Slack", "SLACK_WEBHOOK_URL is not configured in .env.");
      }

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `*${title}*\n${message}`,
            blocks: [
              {
                type: "section",
                text: { type: "mrkdwn", text: `*${title}*\n${message}` },
              },
            ],
          }),
        });

        const durationMs = Date.now() - startTime;
        if (!res.ok) {
          return this.createFailedResult("Slack", new Error(`Slack webhook error HTTP ${res.status}`), durationMs);
        }

        const notificationId = `slack_${Date.now()}`;
        return this.createSuccessResult(
          "Slack",
          notificationId,
          {
            delivered: true,
            channel: "slack",
            notificationId,
            provider: "Slack",
            deliveredAt: new Date().toISOString(),
          },
          durationMs,
        );
      } catch (err: any) {
        return this.createFailedResult("Slack", err, Date.now() - startTime);
      }
    }

    // ── 2. Custom Webhook ────────────────────────────────────────────────────
    if (channel === "webhook") {
      const url = webhookUrl || process.env["WEBHOOK_URL"];
      if (!url) {
        return this.createBlockedResult("Webhook", "No webhook endpoint provided or configured in .env.");
      }

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "optera_autopilot_notification",
            title,
            message,
            orgId,
            metadata: input.metadata,
            timestamp: new Date().toISOString(),
          }),
        });

        const durationMs = Date.now() - startTime;
        if (!res.ok) {
          return this.createFailedResult("Webhook", new Error(`Webhook responded with HTTP ${res.status}`), durationMs);
        }

        const notificationId = `webhook_${Date.now()}`;
        return this.createSuccessResult(
          "Webhook",
          notificationId,
          {
            delivered: true,
            channel: "webhook",
            notificationId,
            provider: "Custom Webhook",
            deliveredAt: new Date().toISOString(),
          },
          durationMs,
        );
      } catch (err: any) {
        return this.createFailedResult("Webhook", err, Date.now() - startTime);
      }
    }

    // ── 3. In-App Notification ───────────────────────────────────────────────
    if (channel === "in_app" && supabase && recipientUserId) {
      try {
        const notificationId = crypto.randomUUID();
        await supabase.from("notifications").insert({
          id: notificationId,
          org_id: orgId,
          user_id: recipientUserId,
          title,
          message,
          type: "system",
          read: false,
          created_at: new Date().toISOString(),
        });

        const durationMs = Date.now() - startTime;
        return this.createSuccessResult(
          "opteraOS In-App",
          notificationId,
          {
            delivered: true,
            channel: "in_app",
            notificationId,
            provider: "opteraOS In-App",
            deliveredAt: new Date().toISOString(),
          },
          durationMs,
        );
      } catch (err: any) {
        return this.createFailedResult("opteraOS In-App", err, Date.now() - startTime);
      }
    }

    return this.createBlockedResult("Notifications", "No valid notification channel or target provided.");
  }
}

export const notificationsConnector = new NotificationsConnector();
