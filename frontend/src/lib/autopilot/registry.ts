import { z } from "zod";
import type { AutopilotToolSpec, ToolExecutionContext, ConnectorResult } from "./types";
import { emailConnector } from "./connectors/email.connector";
import { whatsAppConnector } from "./connectors/whatsapp.connector";
import { paymentsConnector } from "./connectors/payments.connector";
import { crmConnector } from "./connectors/crm.connector";
import { calendarConnector } from "./connectors/calendar.connector";
import { notificationsConnector } from "./connectors/notifications.connector";
import { generateQueryEmbedding, hasGeminiKey } from "@/lib/rag.functions";

class ToolRegistry {
  private tools = new Map<string, AutopilotToolSpec>();

  register<TInput, TOutput>(spec: AutopilotToolSpec<TInput, TOutput>) {
    this.tools.set(spec.name, spec);
  }

  get(name: string): AutopilotToolSpec | undefined {
    return this.tools.get(name);
  }

  getAll(): AutopilotToolSpec[] {
    return Array.from(this.tools.values());
  }

  /**
   * Export tools in OpenAI / Gemini function-calling JSON schema format
   */
  exportFunctionDeclarations(): Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }> {
    return this.getAll().map((tool) => {
      // Basic JSON schema representation from Zod
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          description: `Input parameters for ${tool.name}`,
        },
      };
    });
  }
}

export const AutopilotToolRegistry = new ToolRegistry();

// ─────────────────────────────────────────────────────────────────────────────
// 1. send_customer_email
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "send_customer_email",
  displayName: "Send Customer Email",
  description: "Sends a real outbound email to a customer via the configured provider (Resend, SendGrid, or SMTP).",
  category: "communication",
  riskLevel: "MEDIUM",
  requiredPermissions: ["email.send"],
  inputSchema: z.object({
    to: z.string().email("Valid recipient email is required"),
    subject: z.string().min(2, "Subject is required"),
    content: z.string().min(5, "Email content is required"),
    html: z.string().optional(),
    from: z.string().optional(),
    replyTo: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return emailConnector.execute(input, undefined, ctx.idempotencyKey);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. send_whatsapp_message
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "send_whatsapp_message",
  displayName: "Send WhatsApp Message",
  description: "Dispatches a real WhatsApp message to a customer via Meta WhatsApp Cloud API or Twilio.",
  category: "communication",
  riskLevel: "MEDIUM",
  requiredPermissions: ["whatsapp.send"],
  inputSchema: z.object({
    to: z.string().min(7, "Valid phone number is required"),
    message: z.string().min(1, "Message text is required"),
    templateName: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return whatsAppConnector.execute(input, undefined, ctx.idempotencyKey);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. request_payment
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "request_payment",
  displayName: "Generate Payment Request Link",
  description: "Generates an invoice follow-up to collect outstanding revenue.",
  category: "finance",
  riskLevel: "HIGH",
  requiredPermissions: ["payments.create"],
  inputSchema: z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().default("INR"),
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().optional(),
    description: z.string().optional(),
    referenceId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return paymentsConnector.execute(
      {
        action: "create_payment_link",
        ...input,
      },
      undefined,
      ctx.idempotencyKey,
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. check_payment_status
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "check_payment_status",
  displayName: "Verify Payment Status",
  description: "Checks whether an invoice was settled or marked as paid.",
  category: "finance",
  riskLevel: "LOW",
  requiredPermissions: ["payments.read"],
  inputSchema: z.object({
    paymentLinkId: z.string().optional(),
    paymentId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return paymentsConnector.execute({
      action: "check_payment_status",
      amount: 0,
      currency: "INR",
      ...input,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. create_calendar_event
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_calendar_event",
  displayName: "Schedule Calendar Meeting",
  description: "Schedules a real calendar event or meeting via Google Calendar API.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["calendar.write"],
  inputSchema: z.object({
    title: z.string().min(2, "Title is required"),
    description: z.string().optional(),
    startTime: z.string().min(10, "ISO startTime is required"),
    endTime: z.string().min(10, "ISO endTime is required"),
    attendees: z.array(z.string().email()).optional(),
    location: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return calendarConnector.execute(input);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. get_customer / search_customers
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "get_customer",
  displayName: "Get Customer Details",
  description: "Retrieves complete CRM profile, deals, and invoice records for a specific customer.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["customers.read"],
  inputSchema: z.object({
    customerId: z.string().optional(),
    email: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "get_customer",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

AutopilotToolRegistry.register({
  name: "search_customers",
  displayName: "Search Customers",
  description: "Searches customers by name, company, or lifecycle status.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["customers.read"],
  inputSchema: z.object({
    query: z.string().optional(),
    status: z.string().optional(),
    limit: z.number().optional().default(10),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "search_customers",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. create_customer / update_customer
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_customer",
  displayName: "Create Customer Profile",
  description: "Creates a new customer profile in the organization's CRM.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["customers.write"],
  inputSchema: z.object({
    name: z.string().min(2, "Customer name is required"),
    company: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.string().optional().default("prospect"),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "create_customer",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

AutopilotToolRegistry.register({
  name: "update_customer",
  displayName: "Update Customer Profile",
  description: "Updates contact details, status, or company attributes of an existing customer.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["customers.write"],
  inputSchema: z.object({
    customerId: z.string().min(1, "customerId is required"),
    name: z.string().optional(),
    company: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "update_customer",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. get_deal / create_deal / update_deal
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "get_deal",
  displayName: "Get Deal Details",
  description: "Fetches deal stage, monetary value, and customer association.",
  category: "sales",
  riskLevel: "LOW",
  requiredPermissions: ["deals.read"],
  inputSchema: z.object({
    dealId: z.string().min(1, "dealId is required"),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "get_deal",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

AutopilotToolRegistry.register({
  name: "create_deal",
  displayName: "Create Sales Deal",
  description: "Opens a new sales opportunity in the pipeline.",
  category: "sales",
  riskLevel: "LOW",
  requiredPermissions: ["deals.write"],
  inputSchema: z.object({
    title: z.string().min(2, "Deal title is required"),
    value: z.number().min(0, "Value must be positive"),
    stage: z.string().optional().default("lead"),
    customerId: z.string().optional(),
    expectedClose: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "create_deal",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

AutopilotToolRegistry.register({
  name: "update_deal",
  displayName: "Update Deal",
  description: "Updates deal stage (lead, qualified, proposal, won, lost) or deal value.",
  category: "sales",
  riskLevel: "LOW",
  requiredPermissions: ["deals.write"],
  inputSchema: z.object({
    dealId: z.string().min(1, "dealId is required"),
    title: z.string().optional(),
    value: z.number().optional(),
    stage: z.string().optional(),
    expectedClose: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return crmConnector.execute({
      action: "update_deal",
      orgId: ctx.orgId,
      userId: ctx.userId,
      supabase: ctx.supabase,
      payload: input,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. create_followup_task
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_followup_task",
  displayName: "Create Follow-Up Task",
  description: "Schedules an operational follow-up task assigned to a team member or work group.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["tasks.write"],
  inputSchema: z.object({
    title: z.string().min(2, "Task title is required"),
    description: z.string().optional(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional().default("Medium"),
    dueDate: z.string().optional(),
    customerId: z.string().optional(),
    dealId: z.string().optional(),
    workType: z.string().optional().default("customer_follow_up"),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const taskId = crypto.randomUUID();
      const { data, error } = await ctx.supabase
        .from("tasks")
        .insert({
          id: taskId,
          org_id: ctx.orgId,
          title: input.title,
          description: input.description || null,
          priority: input.priority || "Medium",
          status: "Todo",
          due_date: input.dueDate || null,
          customer_id: input.customerId || null,
          deal_id: input.dealId || null,
          work_type: input.workType || "customer_follow_up",
          source: "autopilot",
          created_by: ctx.userId,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        success: true,
        provider: "opteraOS Tasks Engine",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "opteraOS Tasks Engine",
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. notify_team
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "notify_team",
  displayName: "Send Team Notification",
  description: "Dispatches an alert to Slack, Webhook, or In-App notification feed.",
  category: "communication",
  riskLevel: "LOW",
  requiredPermissions: ["notifications.send"],
  inputSchema: z.object({
    channel: z.enum(["slack", "webhook", "in_app"]).default("in_app"),
    title: z.string().min(2, "Title is required"),
    message: z.string().min(2, "Message is required"),
    recipientUserId: z.string().optional(),
    webhookUrl: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    return notificationsConnector.execute({
      ...input,
      orgId: ctx.orgId,
      supabase: ctx.supabase,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. search_business_data
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "search_business_data",
  displayName: "Search Business Knowledge & SOPs",
  description: "Performs semantic vector RAG search across uploaded company documents, policies, and SOPs.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["knowledge.read"],
  inputSchema: z.object({
    query: z.string().min(2, "Search query is required"),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    const query = input.query;

    try {
      if (hasGeminiKey()) {
        const queryEmbedding = await generateQueryEmbedding(query);
        if (queryEmbedding) {
          const { data: vectorChunks, error: rpcErr } = await ctx.supabase.rpc(
            "match_document_chunks",
            {
              query_embedding: `[${queryEmbedding.join(",")}]`,
              match_threshold: 0.65,
              match_count: 5,
              p_org_id: ctx.orgId,
            },
          );
          if (!rpcErr && vectorChunks && vectorChunks.length > 0) {
            return {
              success: true,
              provider: "Google Vector RAG",
              externalId: `rag_${Date.now()}`,
              data: vectorChunks,
              durationMs: Date.now() - startTime,
            };
          }
        }
      }

      // Keyword fallback
      const { data, error } = await ctx.supabase
        .from("document_chunks")
        .select("content, metadata")
        .eq("org_id", ctx.orgId)
        .ilike("content", `%${query}%`)
        .limit(5);

      if (error) throw error;
      return {
        success: true,
        provider: "PostgreSQL Keyword Search",
        externalId: `kw_${Date.now()}`,
        data: data || [],
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "Knowledge Engine",
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. get_invoices / create_invoice / mark_invoice_paid
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "get_invoices",
  displayName: "List Invoices",
  description: "Queries customer invoices with status filter (DRAFT, SENT, PAID, OVERDUE).",
  category: "finance",
  riskLevel: "LOW",
  requiredPermissions: ["invoices.read"],
  inputSchema: z.object({
    status: z.string().optional(),
    customerId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { invoicesApi } = await import("@/lib/api");
      const res = await invoicesApi.list(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Invoices API",
        externalId: `inv_${Date.now()}`,
        data: res.rows || res,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Invoices API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "create_invoice",
  displayName: "Create Customer Invoice",
  description: "Creates an invoice with line items, tax amount, and due date.",
  category: "finance",
  riskLevel: "HIGH",
  requiredPermissions: ["invoices.write"],
  inputSchema: z.object({
    customerId: z.string().min(1, "customerId is required"),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        taxRate: z.number().optional(),
      }),
    ),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { invoicesApi } = await import("@/lib/api");
      const data = await invoicesApi.create(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Invoices API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Invoices API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "mark_invoice_paid",
  displayName: "Mark Invoice Paid",
  description: "Records payment collection against an invoice.",
  category: "finance",
  riskLevel: "HIGH",
  requiredPermissions: ["invoices.write"],
  inputSchema: z.object({
    invoiceId: z.string().min(1, "invoiceId is required"),
    amount: z.number().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { invoicesApi } = await import("@/lib/api");
      const data = await invoicesApi.markPaid(ctx.orgId, input.invoiceId, input.amount);
      return {
        success: true,
        provider: "opteraOS Invoices API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Invoices API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. post_journal_entry / get_financial_reports / record_expense
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "post_journal_entry",
  displayName: "Post Journal Entry",
  description: "Records a balanced double-entry accounting transaction in the General Ledger.",
  category: "finance",
  riskLevel: "HIGH",
  requiredPermissions: ["accounting.write"],
  inputSchema: z.object({
    reference: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        accountId: z.string(),
        name: z.string(),
        debit: z.number().default(0),
        credit: z.number().default(0),
      }),
    ),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { accountingApi } = await import("@/lib/api");
      const data = await accountingApi.createJournalEntry(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Accounting API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Accounting API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "get_financial_reports",
  displayName: "Get Financial Reports",
  description: "Generates Balance Sheet and Profit & Loss statements from real General Ledger accounts.",
  category: "finance",
  riskLevel: "LOW",
  requiredPermissions: ["accounting.read"],
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    const startTime = Date.now();
    try {
      const { accountingApi } = await import("@/lib/api");
      const data = await accountingApi.getReports(ctx.orgId);
      return {
        success: true,
        provider: "opteraOS Accounting API",
        externalId: `rep_${Date.now()}`,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Accounting API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "record_expense",
  displayName: "Record Business Expense",
  description: "Logs a business operational expense.",
  category: "finance",
  riskLevel: "HIGH",
  requiredPermissions: ["accounting.write"],
  inputSchema: z.object({
    title: z.string().min(2),
    amount: z.number().positive(),
    category: z.string().optional().default("General"),
    notes: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { accountingApi } = await import("@/lib/api");
      const data = await accountingApi.createExpense(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Accounting API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Accounting API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. create_purchase_order / receive_purchase_stock / create_vendor_bill
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_purchase_order",
  displayName: "Create Purchase Order",
  description: "Creates a purchase order for a vendor with items and quantities.",
  category: "operations",
  riskLevel: "HIGH",
  requiredPermissions: ["purchase.write"],
  inputSchema: z.object({
    vendorId: z.string().min(1),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        productId: z.string().optional(),
        name: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
      }),
    ),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { purchaseApi } = await import("@/lib/api");
      const data = await purchaseApi.createOrder(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Purchase API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Purchase API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "receive_purchase_stock",
  displayName: "Receive Purchase Order Stock",
  description: "Receives purchased goods and automatically increments warehouse inventory stock levels.",
  category: "operations",
  riskLevel: "HIGH",
  requiredPermissions: ["purchase.write"],
  inputSchema: z.object({
    orderId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { purchaseApi } = await import("@/lib/api");
      const data = await purchaseApi.receiveStock(ctx.orgId, input.orderId);
      return {
        success: true,
        provider: "opteraOS Purchase API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Purchase API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. create_manufacturing_order / complete_manufacturing_order
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_manufacturing_order",
  displayName: "Create Production Order",
  description: "Creates a manufacturing order based on a Bill of Materials.",
  category: "operations",
  riskLevel: "HIGH",
  requiredPermissions: ["manufacturing.write"],
  inputSchema: z.object({
    productId: z.string().min(1),
    bomId: z.string().optional(),
    quantity: z.number().min(1),
    notes: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { manufacturingApi } = await import("@/lib/api");
      const data = await manufacturingApi.createOrder(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Manufacturing API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Manufacturing API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "complete_manufacturing_order",
  displayName: "Complete Production Order",
  description: "Completes manufacturing order: consumes raw BOM components and produces finished goods stock.",
  category: "operations",
  riskLevel: "HIGH",
  requiredPermissions: ["manufacturing.write"],
  inputSchema: z.object({
    orderId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { manufacturingApi } = await import("@/lib/api");
      const data = await manufacturingApi.completeOrder(ctx.orgId, input.orderId);
      return {
        success: true,
        provider: "opteraOS Manufacturing API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Manufacturing API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. create_project / log_timesheet
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_project",
  displayName: "Create Project",
  description: "Creates a project workspace for client delivery or internal operations.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["projects.write"],
  inputSchema: z.object({
    name: z.string().min(2),
    customerId: z.string().optional(),
    budget: z.number().optional(),
    description: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { projectsApi } = await import("@/lib/api");
      const data = await projectsApi.createProject(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Projects API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Projects API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "log_timesheet",
  displayName: "Log Timesheet Hours",
  description: "Logs worked hours against a project or task.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["projects.write"],
  inputSchema: z.object({
    projectId: z.string().optional(),
    taskId: z.string().optional(),
    hours: z.number().positive(),
    description: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { projectsApi } = await import("@/lib/api");
      const data = await projectsApi.logTimesheet(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Projects API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Projects API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. create_helpdesk_ticket / resolve_helpdesk_ticket
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_helpdesk_ticket",
  displayName: "Create Helpdesk Ticket",
  description: "Creates a customer support or internal helpdesk ticket with SLA tracking.",
  category: "communication",
  riskLevel: "LOW",
  requiredPermissions: ["helpdesk.write"],
  inputSchema: z.object({
    subject: z.string().min(2),
    description: z.string().min(2),
    customerId: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { helpdeskApi } = await import("@/lib/api");
      const data = await helpdeskApi.createTicket(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Helpdesk API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Helpdesk API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "resolve_helpdesk_ticket",
  displayName: "Resolve Support Ticket",
  description: "Marks a helpdesk support ticket as resolved.",
  category: "communication",
  riskLevel: "LOW",
  requiredPermissions: ["helpdesk.write"],
  inputSchema: z.object({
    ticketId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { helpdeskApi } = await import("@/lib/api");
      const data = await helpdeskApi.resolveTicket(ctx.orgId, input.ticketId);
      return {
        success: true,
        provider: "opteraOS Helpdesk API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Helpdesk API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. request_time_off / approve_time_off
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "request_time_off",
  displayName: "Request Leave / Time Off",
  description: "Submits a leave request for an employee.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["hr.write"],
  inputSchema: z.object({
    employeeId: z.string().min(1),
    leaveType: z.string().default("Annual"),
    startDate: z.string(),
    endDate: z.string(),
    daysCount: z.number().positive(),
    reason: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { hrApi } = await import("@/lib/api");
      const data = await hrApi.createTimeOffRequest(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS HR API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS HR API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

AutopilotToolRegistry.register({
  name: "approve_time_off",
  displayName: "Approve Employee Leave",
  description: "Approves a pending employee leave request.",
  category: "productivity",
  riskLevel: "HIGH",
  requiredPermissions: ["hr.write"],
  inputSchema: z.object({
    requestId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { hrApi } = await import("@/lib/api");
      const data = await hrApi.approveTimeOff(ctx.orgId, input.requestId);
      return {
        success: true,
        provider: "opteraOS HR API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS HR API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. create_signature_request
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_signature_request",
  displayName: "Send Digital Signature Request",
  description: "Issues a digital signature request document to a client or stakeholder.",
  category: "communication",
  riskLevel: "HIGH",
  requiredPermissions: ["discuss.write"],
  inputSchema: z.object({
    title: z.string().min(2),
    documentUrl: z.string().min(2),
    signerName: z.string().min(2),
    signerEmail: z.string().email(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { discussApi } = await import("@/lib/api");
      const data = await discussApi.createSignatureRequest(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Sign API",
        externalId: data.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sign API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. create_contact
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_contact",
  displayName: "Create Contact",
  description: "Creates a new contact record in the organization directory.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["contacts.write"],
  inputSchema: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    companyId: z.string().optional(),
    jobTitle: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { contactsApi } = await import("@/lib/api");
      const data = await contactsApi.create(input, ctx.orgId);
      return {
        success: true,
        provider: "opteraOS Contacts API",
        externalId: data?.id || (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Contacts API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. create_company
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "create_company",
  displayName: "Create Business Entity",
  description: "Creates a new B2B company / account record with tax and industry metadata.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["companies.write"],
  inputSchema: z.object({
    legalName: z.string().min(1, "Legal name is required"),
    displayName: z.string().optional(),
    industry: z.string().optional(),
    companySize: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    parentCompanyId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { companiesApi } = await import("@/lib/api");
      const data = await companiesApi.create(input, ctx.orgId);
      return {
        success: true,
        provider: "opteraOS Companies API",
        externalId: data?.id || (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Companies API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. log_activity
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "log_activity",
  displayName: "Log Activity",
  description: "Logs a universal activity or interaction (note, meeting, call, email) against any entity.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["activities.write"],
  inputSchema: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    type: z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "STATUS_CHANGE", "SYSTEM"]).default("NOTE"),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    dueDate: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { activitiesApi } = await import("@/lib/api");
      const data = await activitiesApi.create(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Activities API",
        externalId: data?.id || (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Activities API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 23. send_email_communication
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "send_email_communication",
  displayName: "Send Email Communication",
  description: "Sends an outbound email via the opteraOS Communications engine.",
  category: "communication",
  riskLevel: "MEDIUM",
  requiredPermissions: ["communications.send"],
  inputSchema: z.object({
    to: z.string().email("Valid recipient email is required"),
    subject: z.string().min(1, "Subject is required"),
    text: z.string().optional(),
    html: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { communicationsApi } = await import("@/lib/api");
      const data = await communicationsApi.sendEmail(
        {
          to: input.to,
          subject: input.subject,
          ...(input.text ? { text: input.text } : {}),
          ...(input.html ? { html: input.html } : {}),
        },
        ctx.orgId,
      );
      return {
        success: true,
        provider: "opteraOS Communications Engine",
        externalId: (data as any)?.messageId,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Communications Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 24. add_entity_comment
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "add_entity_comment",
  displayName: "Add Comment / Internal Note",
  description: "Appends a threaded note or comment with audit tracking to any entity.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["comments.write"],
  inputSchema: z.object({
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    content: z.string().min(1, "Comment content is required"),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { commentsApi } = await import("@/lib/api");
      const data = await commentsApi.create(input, ctx.orgId);
      return {
        success: true,
        provider: "opteraOS Comments API",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Comments API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 25. global_search
// ─────────────────────────────────────────────────────────────────────────────
AutopilotToolRegistry.register({
  name: "global_search",
  displayName: "Global Business Search",
  description: "Searches across contacts, companies, employees, customers, tasks, and deals.",
  category: "productivity",
  riskLevel: "LOW",
  requiredPermissions: ["search.read"],
  inputSchema: z.object({
    query: z.string().min(1, "Search query is required"),
    limit: z.number().min(1).max(20).default(5),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { searchApi } = await import("@/lib/api");
      const data = await searchApi.globalSearch(input.query, input.limit, ctx.orgId);
      return {
        success: true,
        provider: "opteraOS Search API",
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Search API", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CRM & Sales Autopilot Tools (Fragment 3)
// ─────────────────────────────────────────────────────────────────────────────

// 26. crm_lead_create
AutopilotToolRegistry.register({
  name: "crm_lead_create",
  displayName: "Create CRM Lead",
  description: "Creates a new inbound or outbound lead with automatic AI scoring and duplicate check.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["leads.write"],
  inputSchema: z.object({
    name: z.string().min(1, "Lead contact name is required"),
    company: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    source: z.string().optional(),
    expectedRevenue: z.number().optional(),
    notes: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { leadsApi } = await import("@/lib/api");
      const data = await leadsApi.create(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS CRM Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS CRM Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 27. crm_lead_qualify
AutopilotToolRegistry.register({
  name: "crm_lead_qualify",
  displayName: "Qualify Lead",
  description: "Marks a lead as QUALIFIED ready for opportunity conversion.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["leads.write"],
  inputSchema: z.object({
    leadId: z.string().min(1, "Lead ID is required"),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { leadsApi } = await import("@/lib/api");
      const data = await leadsApi.qualify(ctx.orgId, input.leadId);
      return {
        success: true,
        provider: "opteraOS CRM Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS CRM Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 28. crm_lead_convert
AutopilotToolRegistry.register({
  name: "crm_lead_convert",
  displayName: "Convert Lead to Opportunity",
  description: "Atomically converts a lead into Customer, Company, Contact, and Sales Opportunity.",
  category: "crm",
  riskLevel: "MEDIUM",
  requiredPermissions: ["leads.write", "deals.write"],
  inputSchema: z.object({
    leadId: z.string().min(1, "Lead ID is required"),
    dealTitle: z.string().optional(),
    value: z.number().optional(),
    pipelineId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { leadsApi } = await import("@/lib/api");
      const { leadId, ...convertData } = input;
      const data = await leadsApi.convert(ctx.orgId, leadId, convertData);
      return {
        success: true,
        provider: "opteraOS CRM Engine",
        externalId: (data as any)?.deal?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS CRM Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 29. crm_lead_assign
AutopilotToolRegistry.register({
  name: "crm_lead_assign",
  displayName: "Assign Lead to Salesperson",
  description: "Assigns a lead using MANUAL, ROUND_ROBIN, or LOAD_BASED strategy.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["leads.write"],
  inputSchema: z.object({
    leadId: z.string().min(1),
    strategy: z.enum(["MANUAL", "ROUND_ROBIN", "LOAD_BASED", "RULE_BASED"]).default("ROUND_ROBIN"),
    targetUserId: z.string().optional(),
    salesTeamId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { leadsApi } = await import("@/lib/api");
      const data = await leadsApi.assign(ctx.orgId, input.leadId, {
        strategy: input.strategy || "ROUND_ROBIN",
        targetUserId: input.targetUserId,
        salesTeamId: input.salesTeamId,
      });
      return {
        success: true,
        provider: "opteraOS CRM Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS CRM Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 30. crm_lead_check_duplicate
AutopilotToolRegistry.register({
  name: "crm_lead_check_duplicate",
  displayName: "Check Duplicate Leads",
  description: "Analyzes prospective lead details against existing leads, contacts, and companies for duplicates.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["leads.read"],
  inputSchema: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { leadsApi } = await import("@/lib/api");
      const data = await leadsApi.checkDuplicates(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS CRM Engine",
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS CRM Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 31. crm_deal_create
AutopilotToolRegistry.register({
  name: "crm_deal_create",
  displayName: "Create Sales Opportunity",
  description: "Creates an active sales opportunity in a pipeline stage with weighted revenue calculation.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["deals.write"],
  inputSchema: z.object({
    title: z.string().min(1, "Opportunity title is required"),
    value: z.number().min(0, "Deal value is required"),
    customerId: z.string().optional(),
    companyId: z.string().optional(),
    pipelineId: z.string().optional(),
    stageId: z.string().optional(),
    expectedCloseDate: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { dealsApi } = await import("@/lib/api");
      const data = await dealsApi.create(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Sales Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sales Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 32. crm_deal_move_stage
AutopilotToolRegistry.register({
  name: "crm_deal_move_stage",
  displayName: "Advance Opportunity Stage",
  description: "Advances an opportunity to a target stage, recording history and recalculating weighted revenue.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["deals.write"],
  inputSchema: z.object({
    dealId: z.string().min(1, "Opportunity ID is required"),
    stageId: z.string().min(1, "Target stage ID is required"),
    reason: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { dealsApi } = await import("@/lib/api");
      const data = await dealsApi.moveStage(ctx.orgId, input.dealId, {
        stageId: input.stageId,
        reason: input.reason,
      });
      return {
        success: true,
        provider: "opteraOS Sales Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sales Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 33. crm_deal_mark_won
AutopilotToolRegistry.register({
  name: "crm_deal_mark_won",
  displayName: "Close Opportunity as Won",
  description: "Marks a sales deal as WON (100% probability) and emits domain revenue event.",
  category: "crm",
  riskLevel: "MEDIUM",
  requiredPermissions: ["deals.write"],
  inputSchema: z.object({
    dealId: z.string().min(1, "Opportunity ID is required"),
    finalRevenue: z.number().optional(),
    reason: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { dealsApi } = await import("@/lib/api");
      const data = await dealsApi.markWon(ctx.orgId, input.dealId, {
        finalRevenue: input.finalRevenue,
        reason: input.reason || "Closed Won via Autopilot",
      });
      return {
        success: true,
        provider: "opteraOS Sales Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sales Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 34. sales_pricelist_calculate
AutopilotToolRegistry.register({
  name: "sales_pricelist_calculate",
  displayName: "Calculate Dynamic Pricing",
  description: "Evaluates multi-tier pricelists, volume breaks, and customer discounts to determine final unit pricing.",
  category: "sales",
  riskLevel: "LOW",
  requiredPermissions: ["products.read"],
  inputSchema: z.object({
    productId: z.string().min(1),
    productVariantId: z.string().optional(),
    pricelistId: z.string().optional(),
    quantity: z.number().min(1).default(1),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { pricelistsApi } = await import("@/lib/api");
      const data = await pricelistsApi.calculatePrice(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Pricing Engine",
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Pricing Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 35. sales_quotation_create
AutopilotToolRegistry.register({
  name: "sales_quotation_create",
  displayName: "Create Sales Quotation",
  description: "Creates a formal sales quotation with sequential number (QT-YYYY-XXXXX) and calculated tax totals.",
  category: "sales",
  riskLevel: "MEDIUM",
  requiredPermissions: ["quotations.write"],
  inputSchema: z.object({
    customerId: z.string().optional(),
    opportunityId: z.string().optional(),
    items: z.array(
      z.object({
        productId: z.string().optional(),
        description: z.string().min(1),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        discountPercent: z.number().optional(),
        taxRate: z.number().optional(),
      }),
    ).min(1, "At least one quotation line item is required"),
    discountAmount: z.number().optional(),
    paymentTerms: z.string().optional(),
    terms: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { quotationsApi } = await import("@/lib/api");
      const data = await quotationsApi.create(ctx.orgId, input);
      return {
        success: true,
        provider: "opteraOS Sales Engine",
        externalId: (data as any)?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sales Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 36. sales_quotation_send_email
AutopilotToolRegistry.register({
  name: "sales_quotation_send_email",
  displayName: "Send Quotation PDF by Email",
  description: "Generates PDF quotation document and sends it directly to customer email.",
  category: "sales",
  riskLevel: "MEDIUM",
  requiredPermissions: ["quotations.write", "communications.send"],
  inputSchema: z.object({
    quotationId: z.string().min(1),
    to: z.string().email(),
    subject: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { quotationsApi } = await import("@/lib/api");
      const data = await quotationsApi.sendEmail(ctx.orgId, input.quotationId, {
        to: input.to,
        subject: input.subject,
        message: input.message,
      });
      return {
        success: true,
        provider: "opteraOS Quotation Engine",
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Quotation Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 37. sales_quotation_accept
AutopilotToolRegistry.register({
  name: "sales_quotation_accept",
  displayName: "Accept Quotation & Confirm Order",
  description: "Transitions quotation to ACCEPTED and generates a confirmed Sales Order (SO-YYYY-XXXXX).",
  category: "sales",
  riskLevel: "HIGH",
  requiredPermissions: ["quotations.write", "orders.write"],
  inputSchema: z.object({
    quotationId: z.string().min(1),
    acceptedBy: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { quotationsApi } = await import("@/lib/api");
      const data = await quotationsApi.accept(ctx.orgId, input.quotationId, {
        acceptedBy: input.acceptedBy,
        notes: input.notes,
      });
      return {
        success: true,
        provider: "opteraOS Sales Engine",
        externalId: (data as any)?.order?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sales Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 38. sales_order_confirm
AutopilotToolRegistry.register({
  name: "sales_order_confirm",
  displayName: "Confirm Sales Order",
  description: "Transitions Sales Order to CONFIRMED and emits fulfillment contract event (sales.order.confirmed).",
  category: "sales",
  riskLevel: "HIGH",
  requiredPermissions: ["orders.write"],
  inputSchema: z.object({
    orderId: z.string().min(1, "Order ID is required"),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { ordersApi } = await import("@/lib/api");
      const data = await ordersApi.confirm(ctx.orgId, input.orderId);
      return {
        success: true,
        provider: "opteraOS Sales Order Engine",
        externalId: (data as any)?.order?.id,
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Sales Order Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});

// 39. crm_customer_360_get
AutopilotToolRegistry.register({
  name: "crm_customer_360_get",
  displayName: "Get Customer 360° Profile",
  description: "Fetches full Customer 360 profile including lifetime value, active orders, quotations, pipeline, and timeline.",
  category: "crm",
  riskLevel: "LOW",
  requiredPermissions: ["customers.read"],
  inputSchema: z.object({
    customerId: z.string().min(1, "Customer ID is required"),
  }),
  execute: async (input, ctx) => {
    const startTime = Date.now();
    try {
      const { customersApi } = await import("@/lib/api");
      const data = await customersApi.getCustomer360(ctx.orgId, input.customerId);
      return {
        success: true,
        provider: "opteraOS Customer 360 Engine",
        data,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return { success: false, provider: "opteraOS Customer 360 Engine", error: err.message, durationMs: Date.now() - startTime };
    }
  },
});



