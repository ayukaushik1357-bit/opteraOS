import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsageControlService, DEFAULT_QUOTAS } from '../src/modules/usage/usage-control.service';
import { CostGuardService } from '../src/modules/usage/cost-guard.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('opteraOS Phase 1 — Security, Cost Protection & Direct Access Integration Tests', () => {
  let usageControl: UsageControlService;
  let costGuard: CostGuardService;
  let prismaMock: any;

  const mockOrgId = 'org_test_101';
  const mockUserId = 'usr_test_202';

  beforeAll(async () => {
    prismaMock = {
      usageLedger: {
        create: jest.fn().mockResolvedValue({ id: 'ledger_1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      aIMessage: {
        create: jest.fn().mockResolvedValue({ id: 'msg_1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageControlService,
        CostGuardService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              if (key === 'NODE_ENV') return 'test';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    usageControl = module.get<UsageControlService>(UsageControlService);
    costGuard = module.get<CostGuardService>(CostGuardService);
  });

  describe('1. Direct Product Access & Rate Limiting', () => {
    it('allows requests within rate limit window', async () => {
      const result = await usageControl.checkRateLimit(`user:${mockUserId}:test`, 10, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    it('rejects burst requests exceeding rate limit threshold with HTTP 429 semantics', async () => {
      const burstKey = `user:${mockUserId}:burst_test`;
      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await usageControl.checkRateLimit(burstKey, 5, 60);
      }
      const burstCheck = await usageControl.checkRateLimit(burstKey, 5, 60);
      expect(burstCheck.allowed).toBe(false);
      expect(burstCheck.remaining).toBe(0);
      expect(burstCheck.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('2. User & Organization Daily Quotas (P0 Cost Guard)', () => {
    it('allows AI requests when within daily quota', async () => {
      const freshOrg = 'org_quota_clean';
      const freshUser = 'usr_quota_clean';

      const budget = await costGuard.evaluateBudget(freshOrg, freshUser, 'AI_CHAT');
      expect(budget.allowed).toBe(true);
    });

    it('blocks AI requests BEFORE calling provider when user daily quota is exhausted', async () => {
      const quotaOrg = 'org_quota_exceeded';
      const quotaUser = 'usr_quota_exceeded';

      // Simulate reaching max daily AI turns
      await usageControl.incrementUsage(quotaOrg, quotaUser, 'AI_CHAT', DEFAULT_QUOTAS.aiDailyPerUser);

      const budget = await costGuard.evaluateBudget(quotaOrg, quotaUser, 'AI_CHAT');
      expect(budget.allowed).toBe(false);
      expect(budget.code).toBe('EXTERNAL_API_BUDGET_EXCEEDED');
      expect(budget.error).toContain('User daily AI quota exceeded');

      // Verify blocked attempt was recorded in UsageLedger table
      expect(prismaMock.usageLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: quotaOrg,
            userId: quotaUser,
            status: 'QUOTA_EXCEEDED',
          }),
        }),
      );
    });

    it('blocks email requests when organization daily email limit is reached', async () => {
      const emailOrg = 'org_email_capped';

      await usageControl.incrementUsage(emailOrg, undefined, 'EMAIL_SEND', DEFAULT_QUOTAS.emailDailyPerOrg);

      const budget = await costGuard.evaluateBudget(emailOrg, undefined, 'EMAIL_SEND');
      expect(budget.allowed).toBe(false);
      expect(budget.code).toBe('EXTERNAL_API_BUDGET_EXCEEDED');
      expect(budget.error).toContain('Organization daily Email send quota exceeded');
    });

    it('blocks autopilot execution when organization daily autopilot limit is reached', async () => {
      const apOrg = 'org_ap_capped';

      await usageControl.incrementUsage(apOrg, undefined, 'AUTOPILOT_RUN', DEFAULT_QUOTAS.autopilotDailyPerOrg);

      const budget = await costGuard.evaluateBudget(apOrg, undefined, 'AUTOPILOT_RUN');
      expect(budget.allowed).toBe(false);
      expect(budget.code).toBe('EXTERNAL_API_BUDGET_EXCEEDED');
      expect(budget.error).toContain('Organization daily Autopilot execution quota exceeded');
    });
  });

  describe('3. Usage Ledger Persistence & Admin Transparency', () => {
    it('persists successful operations into PostgreSQL usage_ledgers table', async () => {
      await costGuard.recordUsage({
        organizationId: mockOrgId,
        userId: mockUserId,
        operation: 'AI_CHAT',
        provider: 'GEMINI',
        service: 'chat',
        requestCount: 1,
        tokensUsed: 420,
        estimatedCost: 0.0005,
        status: 'SUCCESS',
      });

      expect(prismaMock.usageLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            userId: mockUserId,
            operation: 'AI_CHAT',
            provider: 'GEMINI',
            tokensUsed: 420,
            status: 'SUCCESS',
          }),
        }),
      );
    });
  });
});
