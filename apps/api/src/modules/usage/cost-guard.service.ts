import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageControlService } from './usage-control.service';

export interface RecordUsageDto {
  organizationId: string;
  userId?: string;
  operation: string; // 'AI_CHAT', 'AI_EMBEDDING', 'EMAIL_SEND', 'AUTOPILOT_RUN'
  provider: string; // 'GEMINI', 'OPENAI', 'RESEND', 'SENDGRID', 'SMTP'
  service: string; // 'chat', 'embedding', 'transactional_email', 'autopilot'
  requestCount?: number;
  tokensUsed?: number;
  estimatedCost?: number;
  status: 'SUCCESS' | 'RATE_LIMITED' | 'QUOTA_EXCEEDED' | 'FAILED' | 'BLOCKED_BY_CONFIGURATION';
}

@Injectable()
export class CostGuardService {
  private readonly logger = new Logger(CostGuardService.name);

  constructor(
    private prisma: PrismaService,
    private usageControl: UsageControlService,
  ) {}

  /**
   * Pre-flight cost evaluation: Rejects request BEFORE invoking external API if quota is exceeded
   */
  async evaluateBudget(
    orgId: string,
    userId?: string,
    operation: 'AI_CHAT' | 'AI_EMBEDDING' | 'EMAIL_SEND' | 'AUTOPILOT_RUN' = 'AI_CHAT',
  ): Promise<{ allowed: boolean; code?: string; error?: string }> {
    const quotaCheck = await this.usageControl.checkQuota(orgId, userId, operation);

    if (!quotaCheck.allowed) {
      this.logger.warn(`🛑 CostGuard blocked ${operation} for org ${orgId}: ${quotaCheck.reason}`);
      
      // Record blocked attempt in UsageLedger
      await this.recordUsage({
        organizationId: orgId,
        userId,
        operation,
        provider: 'COST_GUARD',
        service: operation.toLowerCase(),
        requestCount: 1,
        tokensUsed: 0,
        estimatedCost: 0,
        status: 'QUOTA_EXCEEDED',
      });

      return {
        allowed: false,
        code: 'EXTERNAL_API_BUDGET_EXCEEDED',
        error: quotaCheck.reason || 'Daily budget limit exceeded for this operation.',
      };
    }

    return { allowed: true };
  }

  /**
   * Persists usage record into PostgreSQL `UsageLedger` table for transparency and cost accounting
   */
  async recordUsage(dto: RecordUsageDto): Promise<void> {
    try {
      await this.prisma.usageLedger.create({
        data: {
          organizationId: dto.organizationId,
          userId: dto.userId || null,
          operation: dto.operation,
          provider: dto.provider,
          service: dto.service,
          requestCount: dto.requestCount ?? 1,
          tokensUsed: dto.tokensUsed ?? 0,
          estimatedCost: dto.estimatedCost ?? 0.0,
          status: dto.status,
        },
      });

      if (dto.status === 'SUCCESS') {
        await this.usageControl.incrementUsage(
          dto.organizationId,
          dto.userId,
          dto.operation as any,
          dto.requestCount ?? 1,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to persist usage ledger: ${err.message}`);
    }
  }

  /**
   * Retrieves aggregate cost and token statistics for tenant admin view
   */
  async getUsageLedger(orgId: string, limit = 50) {
    return this.prisma.usageLedger.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
