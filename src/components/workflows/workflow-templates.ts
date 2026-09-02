export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  category: "onboarding" | "sales" | "support" | "finance";
  badge: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
      nodeType: string;
      label: string;
      config: Record<string, any>;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
  }>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "template-customer-onboarding",
    name: "New Customer Onboarding & AI Enrichment",
    description: "Automatically analyzes new customers with AI, generates welcome tasks, and alerts the team.",
    triggerType: "customer.created",
    category: "onboarding",
    badge: "Popular",
    nodes: [
      {
        id: "node-1",
        type: "customWorkflowNode",
        position: { x: 100, y: 150 },
        data: {
          nodeType: "trigger_customer_created",
          label: "Customer Created",
          config: { filterStatus: "all" },
        },
      },
      {
        id: "node-2",
        type: "customWorkflowNode",
        position: { x: 450, y: 150 },
        data: {
          nodeType: "action_ai_analyze",
          label: "AI Analyze Customer",
          config: {
            prompt: "Analyze {{customer.name}} from company {{customer.company}} and summarize their business potential.",
            model: "gemini-1.5-flash",
          },
        },
      },
      {
        id: "node-3",
        type: "customWorkflowNode",
        position: { x: 800, y: 150 },
        data: {
          nodeType: "action_create_task",
          label: "Create Onboarding Task",
          config: {
            title: "Kickoff onboarding with {{customer.name}}",
            priority: "High",
            description: "AI Summary: {{ai.summary}}\nEmail: {{customer.email}}",
          },
        },
      },
      {
        id: "node-4",
        type: "customWorkflowNode",
        position: { x: 1150, y: 150 },
        data: {
          nodeType: "action_send_notification",
          label: "Notify Team",
          config: {
            title: "New Customer: {{customer.name}}",
            message: "Onboarding task created automatically for {{customer.company}}.",
            type: "success",
          },
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
      { id: "e3-4", source: "node-3", target: "node-4" },
    ],
  },
  {
    id: "template-high-value-lead",
    name: "High Value Lead Qualification & Routing",
    description: "Evaluates inbound leads with AI score > 80, instantly creates a sales deal and notifies executives.",
    triggerType: "lead.created",
    category: "sales",
    badge: "Sales ROI",
    nodes: [
      {
        id: "node-1",
        type: "customWorkflowNode",
        position: { x: 100, y: 200 },
        data: {
          nodeType: "trigger_lead_created",
          label: "Lead Captured",
          config: { source: "all" },
        },
      },
      {
        id: "node-2",
        type: "customWorkflowNode",
        position: { x: 450, y: 200 },
        data: {
          nodeType: "action_ai_classify_lead",
          label: "AI Score Lead",
          config: {
            criteria: "Evaluate fit for opteraOS enterprise tier. Assign score from 1-100.",
          },
        },
      },
      {
        id: "node-3",
        type: "customWorkflowNode",
        position: { x: 800, y: 200 },
        data: {
          nodeType: "logic_if_else",
          label: "Lead Score > 80?",
          config: {
            field: "{{ai.lead_score}}",
            operator: "greater_than",
            value: "80",
          },
        },
      },
      {
        id: "node-4-true",
        type: "customWorkflowNode",
        position: { x: 1150, y: 100 },
        data: {
          nodeType: "action_create_deal",
          label: "Create Enterprise Deal",
          config: {
            title: "VIP Deal: {{lead.company}}",
            amount: 15000,
            stage: "qualified",
          },
        },
      },
      {
        id: "node-4-false",
        type: "customWorkflowNode",
        position: { x: 1150, y: 320 },
        data: {
          nodeType: "action_create_task",
          label: "Nurture Task",
          config: {
            title: "Add {{lead.name}} to drip nurture list",
            priority: "Low",
          },
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
      { id: "e3-4t", source: "node-3", target: "node-4-true", sourceHandle: "true", label: "YES (>80)" },
      { id: "e3-4f", source: "node-3", target: "node-4-false", sourceHandle: "false", label: "NO (<=80)" },
    ],
  },
  {
    id: "template-overdue-invoice",
    name: "Invoice Overdue Escalation",
    description: "Generates polite AI payment reminder, dispatches notification, and flags high-priority finance task.",
    triggerType: "invoice.overdue",
    category: "finance",
    badge: "Finance",
    nodes: [
      {
        id: "node-1",
        type: "customWorkflowNode",
        position: { x: 100, y: 180 },
        data: {
          nodeType: "trigger_invoice_created",
          label: "Invoice Overdue",
          config: {},
        },
      },
      {
        id: "node-2",
        type: "customWorkflowNode",
        position: { x: 450, y: 180 },
        data: {
          nodeType: "action_ai_generate_response",
          label: "AI Draft Friendly Reminder",
          config: {
            goal: "Write friendly payment reminder for Invoice {{invoice.invoice_number}} of ${{invoice.total_amount}}",
            tone: "professional",
          },
        },
      },
      {
        id: "node-3",
        type: "customWorkflowNode",
        position: { x: 800, y: 180 },
        data: {
          nodeType: "action_create_task",
          label: "Finance Task: Follow-up",
          config: {
            title: "Collect payment for Invoice #{{invoice.invoice_number}}",
            priority: "Urgent",
          },
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
    ],
  },
  {
    id: "template-deal-won",
    name: "Deal Won Celebration & Handover",
    description: "When deal transitions to Won, automatically creates the customer record and kickstarts implementation.",
    triggerType: "deal.won",
    category: "sales",
    badge: "Revenue",
    nodes: [
      {
        id: "node-1",
        type: "customWorkflowNode",
        position: { x: 100, y: 150 },
        data: {
          nodeType: "trigger_deal_stage_changed",
          label: "Deal Stage: Won",
          config: { targetStage: "won" },
        },
      },
      {
        id: "node-2",
        type: "customWorkflowNode",
        position: { x: 450, y: 150 },
        data: {
          nodeType: "action_create_customer",
          label: "Create Customer Record",
          config: {
            name: "{{deal.title}}",
            status: "active",
          },
        },
      },
      {
        id: "node-3",
        type: "customWorkflowNode",
        position: { x: 800, y: 150 },
        data: {
          nodeType: "action_send_notification",
          label: "Celebrate Deal Won!",
          config: {
            title: "🎉 Deal Won: ${{deal.amount}}",
            message: "Celebration time! Deal {{deal.title}} successfully closed.",
            type: "success",
          },
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
    ],
  },
];
