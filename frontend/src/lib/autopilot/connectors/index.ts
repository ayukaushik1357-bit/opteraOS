export * from "./base";
export * from "./email.connector";
export * from "./whatsapp.connector";
export * from "./payments.connector";
export * from "./crm.connector";
export * from "./calendar.connector";
export * from "./notifications.connector";

import { emailConnector } from "./email.connector";
import { whatsAppConnector } from "./whatsapp.connector";
import { paymentsConnector } from "./payments.connector";
import { crmConnector } from "./crm.connector";
import { calendarConnector } from "./calendar.connector";
import { notificationsConnector } from "./notifications.connector";

export const CONNECTORS = {
  email: emailConnector,
  whatsapp: whatsAppConnector,
  payments: paymentsConnector,
  crm: crmConnector,
  calendar: calendarConnector,
  notifications: notificationsConnector,
} as const;

/**
 * Returns overall connector health report across all external systems
 */
export function getConnectorsHealthReport() {
  return {
    email: emailConnector.checkHealth(),
    whatsapp: whatsAppConnector.checkHealth(),
    payments: paymentsConnector.checkHealth(),
    crm: crmConnector.checkHealth(),
    calendar: calendarConnector.checkHealth(),
    notifications: notificationsConnector.checkHealth(),
  };
}
