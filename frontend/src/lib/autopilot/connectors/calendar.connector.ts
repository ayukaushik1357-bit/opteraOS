import { BaseConnector, type ConnectorHealth } from "./base";
import type { ConnectorResult } from "../types";

export interface CalendarEventInput {
  title: string;
  description?: string | undefined;
  startTime: string;
  endTime: string;
  attendees?: string[] | undefined;
  location?: string | undefined;
}

export interface CalendarEventOutput {
  eventId: string;
  eventUrl?: string | undefined;
  provider: string;
  scheduledTime: { start: string; end: string };
  attendees: string[];
}

export class CalendarConnector extends BaseConnector<any, CalendarEventInput, CalendarEventOutput> {
  readonly name = "CalendarConnector";
  readonly category = "productivity";

  checkHealth(): ConnectorHealth {
    const googleKey = process.env["GOOGLE_CALENDAR_API_KEY"] || process.env["GOOGLE_SERVICE_ACCOUNT_KEY"];
    if (googleKey) {
      return {
        configured: true,
        provider: "Google Calendar",
        status: "connected",
        details: "Google Calendar API Connected",
      };
    }

    return {
      configured: false,
      provider: null,
      status: "not_configured",
      details: "No Google Calendar credentials configured in .env (GOOGLE_CALENDAR_API_KEY).",
    };
  }

  async execute(input: CalendarEventInput): Promise<ConnectorResult<CalendarEventOutput>> {
    const startTime = Date.now();
    const health = this.checkHealth();

    if (!health.configured || !health.provider) {
      return this.createBlockedResult(
        "Calendar",
        "Google Calendar integration is not configured in .env. Calendar event creation is blocked to avoid unverified scheduling.",
      );
    }

    // If real Google Calendar API key is provided
    try {
      const apiKey = (process.env["GOOGLE_CALENDAR_API_KEY"] || process.env["GOOGLE_SERVICE_ACCOUNT_KEY"])!;
      const calendarId = process.env["GOOGLE_CALENDAR_ID"] || "primary";

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: input.title,
          description: input.description,
          start: { dateTime: input.startTime },
          end: { dateTime: input.endTime },
          attendees: (input.attendees || []).map((email) => ({ email })),
          location: input.location,
        }),
      });

      const durationMs = Date.now() - startTime;
      if (!res.ok) {
        const errText = await res.text();
        return this.createFailedResult("Google Calendar", new Error(`Google Calendar API error: ${errText}`), durationMs);
      }

      const eventData = await res.json();
      return this.createSuccessResult(
        "Google Calendar",
        eventData.id,
        {
          eventId: eventData.id,
          eventUrl: eventData.htmlLink,
          provider: "Google Calendar",
          scheduledTime: { start: input.startTime, end: input.endTime },
          attendees: input.attendees || [],
        },
        durationMs,
        eventData,
      );
    } catch (err: any) {
      return this.createFailedResult("Google Calendar", err, Date.now() - startTime);
    }
  }
}

export const calendarConnector = new CalendarConnector();
