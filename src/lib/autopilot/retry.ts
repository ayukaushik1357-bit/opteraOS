import type { ConnectorResult } from "./types";

/**
 * Generate a deterministic idempotency key for an action
 */
export function generateIdempotencyKey(
  orgId: string,
  executionId: string,
  stepIndex: number,
  toolName: string,
  payload: Record<string, any>,
): string {
  const contentStr = JSON.stringify({ orgId, executionId, stepIndex, toolName, payload });
  let hash = 0;
  for (let i = 0; i < contentStr.length; i++) {
    const chr = contentStr.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `idemp_${orgId.slice(0, 8)}_${Math.abs(hash).toString(36)}_${stepIndex}`;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Execute an asynchronous action with exponential backoff retry for transient network/server failures
 */
export async function executeWithRetry<T>(
  actionFn: () => Promise<ConnectorResult<T>>,
  options: RetryOptions = {},
): Promise<ConnectorResult<T>> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelay = options.initialDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 4000;
  const factor = options.backoffFactor ?? 2;

  let attempt = 0;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    try {
      const result = await actionFn();

      // If successful or explicitly blocked (missing config), do NOT retry
      if (result.success || result.blocked) {
        return result;
      }

      // If HTTP status code is permanent client error (400, 401, 403, 404), do not retry
      if (result.statusCode && result.statusCode >= 400 && result.statusCode < 500 && result.statusCode !== 429) {
        return result;
      }

      attempt++;
      if (attempt > maxRetries) {
        return result;
      }

      // Wait before retry with exponential backoff + jitter
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, maxDelay) + jitter));
      delay *= factor;
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries) {
        return {
          success: false,
          provider: "RetryHandler",
          error: err instanceof Error ? err.message : String(err),
          durationMs: 0,
        };
      }

      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, maxDelay) + jitter));
      delay *= factor;
    }
  }

  return {
    success: false,
    provider: "RetryHandler",
    error: "Maximum retry attempts exceeded",
    durationMs: 0,
  };
}
