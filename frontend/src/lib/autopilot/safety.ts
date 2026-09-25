import { AutopilotToolRegistry } from "./registry";
import type { AutopilotToolSpec, RiskLevel, ToolExecutionContext, ConnectorResult } from "./types";

export interface SafetyCheckResult {
  allowed: boolean;
  requiresHumanApproval: boolean;
  toolSpec?: AutopilotToolSpec;
  validatedPayload?: any;
  blockedReason?: string;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
];

/**
 * Redact secrets and sensitive credentials from objects prior to audit logging
 */
export function sanitizeLogPayload(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogPayload(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogPayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validates tool execution request against the registry, Zod input schema, and risk policies.
 */
export function evaluateToolSafety(
  toolName: string,
  rawPayload: Record<string, any>,
  ctx: ToolExecutionContext,
  requireApprovalForHighRisk = true,
): SafetyCheckResult {
  const toolSpec = AutopilotToolRegistry.get(toolName);

  if (!toolSpec) {
    return {
      allowed: false,
      requiresHumanApproval: false,
      blockedReason: `Tool '${toolName}' is not registered in the Autopilot Tool Registry. Arbitrary tool invocation is blocked.`,
    };
  }

  // 1. Validate Input Payload via Zod Schema
  const parseResult = toolSpec.inputSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    const issueMessages = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      allowed: false,
      requiresHumanApproval: false,
      toolSpec,
      blockedReason: `Invalid payload schema for tool '${toolName}': ${issueMessages}`,
    };
  }

  // 2. High-Risk Human Approval Check
  if (toolSpec.riskLevel === "HIGH" && requireApprovalForHighRisk && !ctx.isApprovalGranted) {
    return {
      allowed: false,
      requiresHumanApproval: true,
      toolSpec,
      validatedPayload: parseResult.data,
      blockedReason: `Action '${toolSpec.displayName}' is classified as HIGH-RISK and requires explicit human approval.`,
    };
  }

  return {
    allowed: true,
    requiresHumanApproval: false,
    toolSpec,
    validatedPayload: parseResult.data,
  };
}
