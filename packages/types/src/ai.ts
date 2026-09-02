export type LLMRole = "user" | "assistant" | "system";

export type MetricWidgetData = {
  type: "pipeline" | "revenue" | "leads";
  title: string;
  value: string;
  subtitle?: string;
  percentage?: number;
  badge?: string;
};

export type LLMMessage = {
  role: LLMRole;
  content: string;
  pendingActions?: PendingAction[] | undefined;
  metricWidget?: MetricWidgetData | undefined;
};

export type OrgContextSummary = {
  orgName: string;
  currency: string;
  totalCustomers: number;
  activeCustomers: number;
  prospectCustomers: number;
  totalDeals: number;
  openDeals: number;
  pipelineValue: number;
  totalInvoices: number;
  overdueInvoices: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  totalLeads: number;
  qualifiedLeads: number;
  recentDeals: { title: string; value: number; stage: string }[];
  recentInvoices: { number: string; amount: number; status: string }[];
};

export type AIActionSafetyLevel = "read" | "low_risk_write" | "high_risk_write";

export type PendingAction = {
  id: string;
  toolName: string;
  safetyLevel: AIActionSafetyLevel;
  title: string;
  description: string;
  payload: Record<string, any>;
  status: "pending" | "approved" | "rejected" | "executed";
  result?: any;
};

export type ToolDefinition = {
  name: string;
  description: string;
  safetyLevel: AIActionSafetyLevel;
  parameters?: Record<string, any> | undefined;
};

export type LLMResponse = {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number | undefined;
  pendingActions?: PendingAction[] | undefined;
  metricWidget?: MetricWidgetData | undefined;
};

export interface AIProvider {
  name: string;
  generateCompletion(messages: LLMMessage[], systemPrompt?: string): Promise<LLMResponse>;
}
