import { z } from "zod";

/**
 * Autopilot Execution Lifecycle Statuses
 */
export type ExecutionStatus =
  | "pending"
  | "planning"
  | "running"
  | "waiting_approval"
  | "blocked"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Action Safety / Risk Classification Tiers
 * - LOW: Safe, non-destructive reads/internal task writes (Auto-executed)
 * - MEDIUM: Outbound external communications (email, whatsapp) (Auto-executed or policy-based)
 * - HIGH: Financial transactions, refunds, deletions, mass data changes (Requires explicit approval)
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Context passed to connector and tool executors
 */
export interface ToolExecutionContext {
  supabase: any;
  orgId: string;
  userId: string;
  executionId: string;
  stepIndex?: number | undefined;
  idempotencyKey?: string | undefined;
  isApprovalGranted?: boolean | undefined;
  metadata?: Record<string, any> | undefined;
}

/**
 * Standardized Connector Execution Result
 */
export interface ConnectorResult<T = any> {
  success: boolean;
  provider: string;
  externalId?: string | null | undefined;
  data?: T | undefined;
  blocked?: boolean | undefined;
  blockedReason?: string | null | undefined;
  error?: string | null | undefined;
  statusCode?: number | undefined;
  durationMs: number;
  idempotencyKey?: string | undefined;
  rawResponse?: any;
}

/**
 * Tool Definition Specification
 */
export interface AutopilotToolSpec<TInput = any, TOutput = any> {
  name: string;
  displayName: string;
  description: string;
  category: "communication" | "sales" | "finance" | "productivity" | "crm" | "management" | "operations";
  riskLevel: RiskLevel;
  requiredPermissions: string[];
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput> | undefined;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  idempotent?: boolean | undefined;
  execute: (input: TInput, ctx: ToolExecutionContext) => Promise<ConnectorResult<TOutput>>;
}

/**
 * Step Record for Multi-Step Orchestration
 */
export interface OrchestratorStep {
  stepNumber: number;
  thought: string;
  action: string;
  toolName: string;
  inputPayload: Record<string, any>;
  result?: ConnectorResult | undefined;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string | undefined;
  durationMs?: number | undefined;
  error?: string | null | undefined;
  observation?: string | undefined;
}

/**
 * High-Level Business Objective / Goal
 */
export interface AutopilotGoal {
  goalId?: string | undefined;
  title: string;
  description?: string | undefined;
  orgId: string;
  userId: string;
  targetEntity?: {
    type: "customer" | "deal" | "invoice" | "lead" | "task" | "general";
    id: string;
  } | undefined;
  contextData?: Record<string, any> | undefined;
  maxSteps?: number | undefined;
  requiresApprovalForHighRisk?: boolean | undefined;
}

/**
 * Overall Orchestration Final Result
 */
export interface OrchestrationResult {
  executionId: string;
  goal: string;
  status: ExecutionStatus;
  outcomeSummary: string;
  steps: OrchestratorStep[];
  totalDurationMs: number;
  startedAt: string;
  completedAt: string;
  error?: string | null | undefined;
  blockedReason?: string | null | undefined;
  waitingApprovalAction?: {
    toolName: string;
    payload: Record<string, any>;
    riskLevel: RiskLevel;
  } | null | undefined;
  metrics: {
    stepsExecuted: number;
    toolsUsed: string[];
    externalApiCalls: number;
  };
}
