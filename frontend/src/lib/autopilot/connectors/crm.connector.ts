import { BaseConnector, type ConnectorHealth } from "./base";
import type { ConnectorResult } from "../types";
import { customersApi, dealsApi } from "@/lib/api";

export interface CrmInput {
  action: "get_customer" | "search_customers" | "create_customer" | "update_customer" | "create_deal" | "update_deal" | "get_deal";
  orgId: string;
  userId?: string | undefined;
  supabase?: any;
  payload: any;
}

export class CrmConnector extends BaseConnector<any, CrmInput, any> {
  readonly name = "CrmConnector";
  readonly category = "crm";

  checkHealth(): ConnectorHealth {
    const hubspotToken = process.env["HUBSPOT_ACCESS_TOKEN"];
    if (hubspotToken) {
      return {
        configured: true,
        provider: "HubSpot CRM + opteraOS API",
        status: "connected",
        details: "HubSpot API Sync Enabled",
      };
    }

    return {
      configured: true,
      provider: "opteraOS Core CRM Service",
      status: "connected",
      details: "opteraOS Enterprise REST API CRM Engine",
    };
  }

  async execute(input: CrmInput): Promise<ConnectorResult<any>> {
    const startTime = Date.now();
    const { action, orgId, payload } = input;

    try {
      switch (action) {
        case "get_customer": {
          const data = await customersApi.get(orgId, payload.customerId || payload.id);
          return this.createSuccessResult("opteraOS CRM API", data.id, data, Date.now() - startTime);
        }

        case "search_customers": {
          const res = await customersApi.list(orgId, { search: payload.query, status: payload.status, pageSize: payload.limit || 10 });
          const rows = res.rows || res || [];
          return this.createSuccessResult("opteraOS CRM API", `search_${Date.now()}`, rows, Date.now() - startTime);
        }

        case "create_customer": {
          const data = await customersApi.create(orgId, payload);
          return this.createSuccessResult("opteraOS CRM API", data.id, data, Date.now() - startTime);
        }

        case "update_customer": {
          const data = await customersApi.update(orgId, payload.customerId || payload.id, payload);
          return this.createSuccessResult("opteraOS CRM API", data.id, data, Date.now() - startTime);
        }

        case "create_deal": {
          const data = await dealsApi.create(orgId, payload);
          return this.createSuccessResult("opteraOS CRM API", data.id, data, Date.now() - startTime);
        }

        case "update_deal": {
          const data = await dealsApi.update(orgId, payload.dealId || payload.id, payload);
          return this.createSuccessResult("opteraOS CRM API", data.id, data, Date.now() - startTime);
        }

        case "get_deal": {
          const data = await dealsApi.get(orgId, payload.dealId || payload.id);
          return this.createSuccessResult("opteraOS CRM API", data.id, data, Date.now() - startTime);
        }

        default:
          return this.createBlockedResult("opteraOS CRM API", `Unsupported CRM action: ${action}`);
      }
    } catch (err: any) {
      return this.createFailedResult("opteraOS CRM API", err, Date.now() - startTime);
    }
  }
}

export const crmConnector = new CrmConnector();
