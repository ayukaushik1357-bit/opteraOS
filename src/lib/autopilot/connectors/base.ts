import type { ConnectorResult } from "../types";

export interface ConnectorHealth {
  configured: boolean;
  provider: string | null;
  status: "connected" | "not_configured" | "error";
  details: string;
}

export abstract class BaseConnector<TConfig = any, TInput = any, TOutput = any> {
  abstract readonly name: string;
  abstract readonly category: string;

  /**
   * Check whether this connector has valid credentials configured in the environment or organization settings.
   */
  abstract checkHealth(orgConfig?: TConfig): Promise<ConnectorHealth> | ConnectorHealth;

  /**
   * Execute real external API operation.
   * NEVER claim success unless the provider returns a positive confirmation / external identifier.
   */
  abstract execute(input: TInput, orgConfig?: TConfig, idempotencyKey?: string): Promise<ConnectorResult<TOutput>>;

  /**
   * Utility helper to construct standardized blocked result
   */
  protected createBlockedResult(providerName: string, reason: string): ConnectorResult<TOutput> {
    return {
      success: false,
      provider: providerName,
      blocked: true,
      blockedReason: reason,
      durationMs: 0,
      error: `Execution BLOCKED: ${reason}`,
    };
  }

  /**
   * Utility helper to construct standardized failed result
   */
  protected createFailedResult(
    providerName: string,
    error: any,
    durationMs: number,
    statusCode?: number,
  ): ConnectorResult<TOutput> {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      provider: providerName,
      error: errorMsg,
      statusCode,
      durationMs,
    };
  }

  /**
   * Utility helper to construct standardized success result with real external ID
   */
  protected createSuccessResult(
    providerName: string,
    externalId: string,
    data: TOutput,
    durationMs: number,
    rawResponse?: any,
  ): ConnectorResult<TOutput> {
    return {
      success: true,
      provider: providerName,
      externalId,
      data,
      durationMs,
      rawResponse,
    };
  }
}
