export type NodeCategory =
  | "triggers"
  | "crm"
  | "ai"
  | "communication"
  | "business"
  | "logic"
  | "data";

export interface ConfigField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "switch" | "number" | "conditions" | "json";
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  supportsVariables?: boolean;
}

export interface OutputVariable {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  isTrigger?: boolean;
  inputs: number; // 0 for triggers, 1 for normal actions
  outputs: { id: string; label?: string }[]; // e.g. [{ id: 'main' }] or [{ id: 'true', label: 'YES / True' }, { id: 'false', label: 'NO / False' }]
  defaultConfig: Record<string, any>;
  fields: ConfigField[];
  outputVariables: OutputVariable[];
}

export const NODE_REGISTRY: Record<string, NodeDefinition> = {
  // ─────────────────────────────────────────────────────────────────────────
  // TRIGGERS
  // ─────────────────────────────────────────────────────────────────────────
  "trigger_customer_created": {
    type: "trigger_customer_created",
    label: "Customer Created",
    category: "triggers",
    description: "Fires whenever a new customer is added to opteraOS CRM",
    icon: "UserPlus",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: { filterStatus: "all" },
    fields: [
      {
        name: "filterStatus",
        label: "Customer Status Filter",
        type: "select",
        options: [
          { label: "All Customers", value: "all" },
          { label: "Active Customers Only", value: "active" },
          { label: "Prospects Only", value: "prospect" },
        ],
        defaultValue: "all",
      },
    ],
    outputVariables: [
      { key: "customer.id", label: "Customer ID", type: "string" },
      { key: "customer.name", label: "Full Name", type: "string" },
      { key: "customer.email", label: "Email Address", type: "string" },
      { key: "customer.company", label: "Company", type: "string" },
      { key: "customer.phone", label: "Phone", type: "string" },
      { key: "customer.status", label: "Status", type: "string" },
      { key: "customer.created_at", label: "Created Timestamp", type: "string" },
    ],
  },

  "trigger_customer_updated": {
    type: "trigger_customer_updated",
    label: "Customer Updated",
    category: "triggers",
    description: "Fires when existing customer details or status change",
    icon: "UserCheck",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: {},
    fields: [],
    outputVariables: [
      { key: "customer.id", label: "Customer ID", type: "string" },
      { key: "customer.name", label: "Customer Name", type: "string" },
      { key: "customer.email", label: "Customer Email", type: "string" },
      { key: "customer.company", label: "Company Name", type: "string" },
      { key: "customer.status", label: "New Status", type: "string" },
    ],
  },

  "trigger_lead_created": {
    type: "trigger_lead_created",
    label: "Lead Created",
    category: "triggers",
    description: "Fires when an inbound lead is captured from forms or API",
    icon: "Target",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: { source: "all" },
    fields: [
      {
        name: "source",
        label: "Lead Source Filter",
        type: "select",
        options: [
          { label: "All Sources", value: "all" },
          { label: "Website Form", value: "website" },
          { label: "Referral", value: "referral" },
          { label: "Cold Inbound", value: "cold" },
        ],
        defaultValue: "all",
      },
    ],
    outputVariables: [
      { key: "lead.id", label: "Lead ID", type: "string" },
      { key: "lead.name", label: "Lead Name", type: "string" },
      { key: "lead.email", label: "Lead Email", type: "string" },
      { key: "lead.company", label: "Company", type: "string" },
      { key: "lead.score", label: "Lead Score", type: "number" },
      { key: "lead.stage", label: "Stage", type: "string" },
    ],
  },

  "trigger_deal_stage_changed": {
    type: "trigger_deal_stage_changed",
    label: "Deal Stage Changed",
    category: "triggers",
    description: "Fires when a deal transitions stage (e.g. Proposal -> Won)",
    icon: "Briefcase",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: { targetStage: "won" },
    fields: [
      {
        name: "targetStage",
        label: "Trigger When Stage Equals",
        type: "select",
        options: [
          { label: "Any Stage Change", value: "any" },
          { label: "Stage: Won", value: "won" },
          { label: "Stage: Qualified", value: "qualified" },
          { label: "Stage: Proposal", value: "proposal" },
          { label: "Stage: Lost", value: "lost" },
        ],
        defaultValue: "won",
      },
    ],
    outputVariables: [
      { key: "deal.id", label: "Deal ID", type: "string" },
      { key: "deal.title", label: "Deal Title", type: "string" },
      { key: "deal.amount", label: "Deal Amount ($)", type: "number" },
      { key: "deal.stage", label: "Current Stage", type: "string" },
      { key: "deal.customer_id", label: "Associated Customer ID", type: "string" },
    ],
  },

  "trigger_invoice_created": {
    type: "trigger_invoice_created",
    label: "Invoice Created",
    category: "triggers",
    description: "Fires when an invoice is drafted or issued",
    icon: "Receipt",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: {},
    fields: [],
    outputVariables: [
      { key: "invoice.id", label: "Invoice ID", type: "string" },
      { key: "invoice.invoice_number", label: "Invoice Number", type: "string" },
      { key: "invoice.total_amount", label: "Total Amount ($)", type: "number" },
      { key: "invoice.customer_name", label: "Customer Name", type: "string" },
      { key: "invoice.status", label: "Status", type: "string" },
      { key: "invoice.due_date", label: "Due Date", type: "string" },
    ],
  },

  "trigger_invoice_paid": {
    type: "trigger_invoice_paid",
    label: "Invoice Paid",
    category: "triggers",
    description: "Fires when an invoice payment is marked as paid",
    icon: "BadgeCheck",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: {},
    fields: [],
    outputVariables: [
      { key: "invoice.id", label: "Invoice ID", type: "string" },
      { key: "invoice.invoice_number", label: "Invoice Number", type: "string" },
      { key: "invoice.amount_paid", label: "Amount Paid", type: "number" },
      { key: "invoice.payment_method", label: "Payment Method", type: "string" },
    ],
  },

  "trigger_webhook": {
    type: "trigger_webhook",
    label: "Incoming Webhook / n8n",
    category: "triggers",
    description: "Accepts JSON payloads from n8n, Stripe, form submitters, or external APIs",
    icon: "Webhook",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: { method: "POST" },
    fields: [
      {
        name: "pathSuffix",
        label: "Webhook Slug Identifier",
        type: "text",
        placeholder: "e.g. hubspot-sync or typeform-inbound",
        defaultValue: "inbound",
      },
    ],
    outputVariables: [
      { key: "webhook.body", label: "Request Body Payload", type: "object" },
      { key: "webhook.headers", label: "Headers", type: "object" },
    ],
  },

  "trigger_manual": {
    type: "trigger_manual",
    label: "Manual Trigger",
    category: "triggers",
    description: "Manually triggered on-demand by team members or test runner",
    icon: "PlayCircle",
    isTrigger: true,
    inputs: 0,
    outputs: [{ id: "main" }],
    defaultConfig: {},
    fields: [],
    outputVariables: [
      { key: "trigger.user_id", label: "Initiator User ID", type: "string" },
      { key: "trigger.timestamp", label: "Trigger Timestamp", type: "string" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AI INTELLIGENCE
  // ─────────────────────────────────────────────────────────────────────────
  "action_ai_analyze": {
    type: "action_ai_analyze",
    label: "AI Analyze Customer / Lead",
    category: "ai",
    description: "Deep AI semantic analysis of customer attributes, churn risk, and intent",
    icon: "Sparkles",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      prompt: "Analyze this customer record and predict churn risk, upsell potential, and customer persona: {{customer.name}} from {{customer.company}}.",
      model: "gemini-1.5-flash",
    },
    fields: [
      {
        name: "prompt",
        label: "Analysis Instructions / Prompt",
        type: "textarea",
        placeholder: "Instructions for the AI model... use {{variables}}",
        supportsVariables: true,
        defaultValue: "Analyze customer {{customer.name}} ({{customer.email}}) and extract key strategic insights.",
      },
      {
        name: "model",
        label: "AI Model",
        type: "select",
        options: [
          { label: "Gemini 1.5 Flash (Fast & Recommended)", value: "gemini-1.5-flash" },
          { label: "Gemini 1.5 Pro (Deep Reasoning)", value: "gemini-1.5-pro" },
          { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
        ],
        defaultValue: "gemini-1.5-flash",
      },
    ],
    outputVariables: [
      { key: "ai.analysis", label: "Full AI Analysis Text", type: "string" },
      { key: "ai.score", label: "Estimated Score (1-100)", type: "number" },
      { key: "ai.summary", label: "Concise Summary", type: "string" },
      { key: "ai.sentiment", label: "Sentiment (positive/neutral/negative)", type: "string" },
    ],
  },

  "action_ai_generate_response": {
    type: "action_ai_generate_response",
    label: "AI Generate Response / Email",
    category: "ai",
    description: "Drafts tailored, hyper-personalized emails and messages using CRM context",
    icon: "Bot",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      tone: "professional",
      goal: "Welcome new customer and outline next onboarding milestones",
    },
    fields: [
      {
        name: "goal",
        label: "Message Goal",
        type: "text",
        placeholder: "e.g. Schedule a product demo with {{lead.name}}",
        supportsVariables: true,
      },
      {
        name: "tone",
        label: "Tone & Voice",
        type: "select",
        options: [
          { label: "Professional & Friendly", value: "professional" },
          { label: "Warm & Welcoming", value: "warm" },
          { label: "Direct & Urgent", value: "urgent" },
          { label: "Executive / C-Level", value: "executive" },
        ],
        defaultValue: "professional",
      },
    ],
    outputVariables: [
      { key: "ai.subject", label: "Generated Email Subject", type: "string" },
      { key: "ai.body", label: "Generated Email Body", type: "string" },
    ],
  },

  "action_ai_classify_lead": {
    type: "action_ai_classify_lead",
    label: "AI Classify & Score Lead",
    category: "ai",
    description: "Evaluates lead qualification criteria and assigns a qualification score (0-100)",
    icon: "Gauge",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      criteria: "Score lead based on company size, role, urgency, and budget indicators.",
    },
    fields: [
      {
        name: "criteria",
        label: "Qualification Rules / Criteria",
        type: "textarea",
        placeholder: "Describe what makes a lead high value...",
        supportsVariables: true,
        defaultValue: "Score lead from 1 to 100 based on fit, company size, and urgency.",
      },
    ],
    outputVariables: [
      { key: "ai.lead_score", label: "Lead Score (0-100)", type: "number" },
      { key: "ai.tier", label: "Lead Tier (A/B/C)", type: "string" },
      { key: "ai.rationale", label: "Scoring Rationale", type: "string" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CRM ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  "action_create_customer": {
    type: "action_create_customer",
    label: "Create Customer",
    category: "crm",
    description: "Inserts a new customer record directly into opteraOS CRM",
    icon: "UserPlus",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      name: "{{lead.name}}",
      email: "{{lead.email}}",
      company: "{{lead.company}}",
      status: "active",
    },
    fields: [
      { name: "name", label: "Customer Name", type: "text", supportsVariables: true, placeholder: "e.g. {{lead.name}}" },
      { name: "email", label: "Customer Email", type: "text", supportsVariables: true, placeholder: "e.g. {{lead.email}}" },
      { name: "company", label: "Company", type: "text", supportsVariables: true, placeholder: "e.g. {{lead.company}}" },
      {
        name: "status",
        label: "Initial Status",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Prospect", value: "prospect" },
        ],
        defaultValue: "active",
      },
    ],
    outputVariables: [
      { key: "new_customer.id", label: "Created Customer ID", type: "string" },
      { key: "new_customer.name", label: "Customer Name", type: "string" },
    ],
  },

  "action_update_customer": {
    type: "action_update_customer",
    label: "Update Customer",
    category: "crm",
    description: "Updates properties or tags on an existing customer",
    icon: "UserCheck",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      customerId: "{{customer.id}}",
      status: "active",
    },
    fields: [
      { name: "customerId", label: "Customer ID", type: "text", supportsVariables: true, placeholder: "{{customer.id}}" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Keep Unchanged", value: "unchanged" },
          { label: "Active", value: "active" },
          { label: "Prospect", value: "prospect" },
          { label: "Churned", value: "churned" },
        ],
        defaultValue: "active",
      },
      { name: "company", label: "Update Company", type: "text", supportsVariables: true },
    ],
    outputVariables: [
      { key: "updated_customer.id", label: "Updated Customer ID", type: "string" },
    ],
  },

  "action_create_deal": {
    type: "action_create_deal",
    label: "Create Deal",
    category: "crm",
    description: "Creates an active sales deal linked to customer or lead",
    icon: "DollarSign",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      title: "New Opportunity - {{customer.company}}",
      amount: "5000",
      stage: "lead",
    },
    fields: [
      { name: "title", label: "Deal Title", type: "text", supportsVariables: true, placeholder: "e.g. Annual Subscription - {{customer.name}}" },
      { name: "amount", label: "Deal Value ($)", type: "number", defaultValue: 5000 },
      {
        name: "stage",
        label: "Initial Stage",
        type: "select",
        options: [
          { label: "Lead", value: "lead" },
          { label: "Qualified", value: "qualified" },
          { label: "Proposal", value: "proposal" },
          { label: "Negotiation", value: "negotiation" },
        ],
        defaultValue: "lead",
      },
    ],
    outputVariables: [
      { key: "deal.id", label: "Created Deal ID", type: "string" },
      { key: "deal.title", label: "Deal Title", type: "string" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BUSINESS OPERATIONS (TASKS, ACTIVITIES)
  // ─────────────────────────────────────────────────────────────────────────
  "action_create_task": {
    type: "action_create_task",
    label: "Create Task",
    category: "business",
    description: "Assigns a follow-up task to team members with due date and priority",
    icon: "CheckSquare",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      title: "Follow up with {{customer.name}}",
      priority: "High",
      status: "Todo",
      description: "AI Summary: {{ai.summary}}",
    },
    fields: [
      { name: "title", label: "Task Title", type: "text", supportsVariables: true, placeholder: "e.g. Schedule onboarding with {{customer.name}}" },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: [
          { label: "Low", value: "Low" },
          { label: "Medium", value: "Medium" },
          { label: "High", value: "High" },
          { label: "Urgent", value: "Urgent" },
        ],
        defaultValue: "High",
      },
      { name: "description", label: "Task Details", type: "textarea", supportsVariables: true, placeholder: "Add task instructions..." },
    ],
    outputVariables: [
      { key: "task.id", label: "Created Task ID", type: "string" },
      { key: "task.title", label: "Task Title", type: "string" },
    ],
  },

  "action_add_activity": {
    type: "action_add_activity",
    label: "Add Activity Log",
    category: "business",
    description: "Logs an interaction, call note, or audit trail to customer timeline",
    icon: "Activity",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      type: "note",
      title: "Automated Workflow Step Completed",
    },
    fields: [
      {
        name: "type",
        label: "Activity Type",
        type: "select",
        options: [
          { label: "Note", value: "note" },
          { label: "Call", value: "call" },
          { label: "Meeting", value: "meeting" },
          { label: "Email Sent", value: "email" },
        ],
        defaultValue: "note",
      },
      { name: "title", label: "Activity Summary", type: "text", supportsVariables: true },
      { name: "details", label: "Detailed Notes", type: "textarea", supportsVariables: true },
    ],
    outputVariables: [
      { key: "activity.id", label: "Activity ID", type: "string" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────
  "action_send_email": {
    type: "action_send_email",
    label: "Send Email",
    category: "communication",
    description: "Sends an email template or AI draft directly to the customer",
    icon: "Mail",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      to: "{{customer.email}}",
      subject: "Welcome to our platform, {{customer.name}}!",
      body: "Hi {{customer.name}},\n\nWelcome aboard! We are thrilled to partner with {{customer.company}}.\n\nBest regards,\nThe Team",
    },
    fields: [
      { name: "to", label: "Recipient Email", type: "text", supportsVariables: true, placeholder: "{{customer.email}}" },
      { name: "subject", label: "Email Subject", type: "text", supportsVariables: true, placeholder: "Welcome {{customer.name}}!" },
      { name: "body", label: "Message Body", type: "textarea", supportsVariables: true, placeholder: "Write your email message..." },
    ],
    outputVariables: [
      { key: "email.status", label: "Delivery Status", type: "string" },
      { key: "email.message_id", label: "Message ID", type: "string" },
    ],
  },

  "action_send_notification": {
    type: "action_send_notification",
    label: "Send In-App Notification",
    category: "communication",
    description: "Pushes real-time alerts to the opteraOS team notification bell",
    icon: "Bell",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      title: "New Customer Onboarded: {{customer.name}}",
      message: "Customer created for company {{customer.company}}",
      type: "info",
    },
    fields: [
      { name: "title", label: "Notification Title", type: "text", supportsVariables: true },
      { name: "message", label: "Notification Message", type: "textarea", supportsVariables: true },
      {
        name: "type",
        label: "Alert Level",
        type: "select",
        options: [
          { label: "Info", value: "info" },
          { label: "Success", value: "success" },
          { label: "Warning", value: "warning" },
          { label: "Urgent Alert", value: "error" },
        ],
        defaultValue: "info",
      },
    ],
    outputVariables: [
      { key: "notification.id", label: "Notification ID", type: "string" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIC & CONTROL FLOW
  // ─────────────────────────────────────────────────────────────────────────
  "logic_if_else": {
    type: "logic_if_else",
    label: "IF / ELSE Condition",
    category: "logic",
    description: "Splits execution into TRUE and FALSE branches based on rules",
    icon: "GitBranch",
    inputs: 1,
    outputs: [
      { id: "true", label: "YES (True)" },
      { id: "false", label: "NO (False)" },
    ],
    defaultConfig: {
      field: "{{ai.lead_score}}",
      operator: "greater_than",
      value: "80",
    },
    fields: [
      {
        name: "field",
        label: "Condition Field",
        type: "text",
        supportsVariables: true,
        placeholder: "e.g. {{ai.lead_score}} or {{deal.amount}}",
        defaultValue: "{{ai.lead_score}}",
      },
      {
        name: "operator",
        label: "Comparison Operator",
        type: "select",
        options: [
          { label: "Equals (==)", value: "equals" },
          { label: "Not Equals (!=)", value: "not_equals" },
          { label: "Greater Than (>)", value: "greater_than" },
          { label: "Less Than (<)", value: "less_than" },
          { label: "Contains text", value: "contains" },
          { label: "Is Not Empty", value: "is_not_empty" },
          { label: "Is Empty / Null", value: "is_empty" },
        ],
        defaultValue: "greater_than",
      },
      {
        name: "value",
        label: "Target Value",
        type: "text",
        supportsVariables: true,
        placeholder: "e.g. 80 or active",
        defaultValue: "80",
      },
    ],
    outputVariables: [
      { key: "condition.result", label: "Evaluation Result (true/false)", type: "boolean" },
    ],
  },

  "logic_delay": {
    type: "logic_delay",
    label: "Delay / Wait",
    category: "logic",
    description: "Pauses workflow for a specified duration before executing next step",
    icon: "Clock",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      amount: 1,
      unit: "hours",
    },
    fields: [
      { name: "amount", label: "Wait Duration Amount", type: "number", defaultValue: 1 },
      {
        name: "unit",
        label: "Time Unit",
        type: "select",
        options: [
          { label: "Minutes", value: "minutes" },
          { label: "Hours", value: "hours" },
          { label: "Days", value: "days" },
        ],
        defaultValue: "hours",
      },
    ],
    outputVariables: [],
  },

  "logic_stop": {
    type: "logic_stop",
    label: "Stop Workflow",
    category: "logic",
    description: "Terminates workflow branch cleanly without error",
    icon: "Octagon",
    inputs: 1,
    outputs: [],
    defaultConfig: { reason: "Conditions not met" },
    fields: [
      { name: "reason", label: "Termination Reason", type: "text", defaultValue: "Execution finished branch" },
    ],
    outputVariables: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DATA & INTEGRATIONS
  // ─────────────────────────────────────────────────────────────────────────
  "data_get_customer": {
    type: "data_get_customer",
    label: "Get Customer Details",
    category: "data",
    description: "Fetches full customer profile and CRM history by Customer ID",
    icon: "Search",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: { customerId: "{{customer.id}}" },
    fields: [
      { name: "customerId", label: "Customer ID", type: "text", supportsVariables: true, placeholder: "{{customer.id}}" },
    ],
    outputVariables: [
      { key: "customer.name", label: "Customer Name", type: "string" },
      { key: "customer.email", label: "Email", type: "string" },
      { key: "customer.company", label: "Company", type: "string" },
      { key: "customer.status", label: "Status", type: "string" },
    ],
  },

  "data_webhook_outbound": {
    type: "data_webhook_outbound",
    label: "HTTP Request / Webhook Out",
    category: "data",
    description: "Sends an HTTP POST/GET request to n8n, Zapier, or your external webhook endpoint",
    icon: "Send",
    inputs: 1,
    outputs: [{ id: "main" }],
    defaultConfig: {
      url: "https://your-n8n-instance.com/webhook/endpoint",
      method: "POST",
    },
    fields: [
      { name: "url", label: "Endpoint URL", type: "text", placeholder: "https://n8n.yourdomain.com/webhook/...", supportsVariables: true },
      {
        name: "method",
        label: "HTTP Method",
        type: "select",
        options: [
          { label: "POST", value: "POST" },
          { label: "GET", value: "GET" },
          { label: "PUT", value: "PUT" },
        ],
        defaultValue: "POST",
      },
    ],
    outputVariables: [
      { key: "http.status", label: "Response HTTP Status", type: "number" },
      { key: "http.data", label: "Response Body JSON", type: "object" },
    ],
  },
};

export const CATEGORY_INFO: Record<NodeCategory, { label: string; icon: string; color: string }> = {
  triggers: { label: "Triggers", icon: "Zap", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  ai: { label: "AI Intelligence", icon: "Sparkles", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  crm: { label: "CRM & Sales", icon: "Users", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  business: { label: "Operations & Tasks", icon: "CheckSquare", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  communication: { label: "Communication", icon: "Mail", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  logic: { label: "Logic & Branching", icon: "GitBranch", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  data: { label: "Data & Webhooks", icon: "Database", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
};
