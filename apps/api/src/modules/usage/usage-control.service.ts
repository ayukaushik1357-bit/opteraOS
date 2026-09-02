import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface QuotaLimits {
  aiDailyPerUser: number;
  aiDailyPerOrg: number;
  emailDailyPerOrg: number;
  autopilotDailyPerOrg: number;
  rateLimitPerMinute: number;
}

export const DEFAULT_QUOTAS: QuotaLimits = {
  aiDailyPerUser: 50,
  aiDailyPerOrg: 200,
  emailDailyPerOrg: 100,
  autopilotDailyPerOrg: 50,
  rateLimitPerMinute: 30,
};

@Injectable()
export class UsageControlService {
  private readonly logger = new Logger(UsageControlService.name);
  private redis: Redis | null = null;
  private memoryCounters = new Map<string, { count: number; expiresAt: number }>();

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't hang if Redis is offline; fallback to in-memory
      });
      this.redis.connect().catch(() => {
        this.logger.warn('⚠️ Redis offline. Using high-performance in-memory UsageControl fallback.');
      });
    } catch {
      this.logger.warn('⚠️ Redis initialization failed. Using in-memory fallback.');
    }
  }

  private getDateKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * Rate Limit check using sliding window / token counter
   */
  async checkRateLimit(
    key: string,
    limit = DEFAULT_QUOTAS.rateLimitPerMinute,
    windowSeconds = 60,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    const redisKey = `ratelimit:${key}`;
    const now = Date.now();

    if (this.redis && this.redis.status === 'ready') {
      try {
        const count = await this.redis.incr(redisKey);
        if (count === 1) {
          await this.redis.expire(redisKey, windowSeconds);
        }
        if (count > limit) {
          const ttl = await this.redis.ttl(redisKey);
          return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSeconds };
        }
        return { allowed: true, remaining: Math.max(0, limit - count) };
      } catch {
        // Fall back to memory
      }
    }

    // In-memory fallback
    const entry = this.memoryCounters.get(redisKey);
    if (!entry || entry.expiresAt <= now) {
      this.memoryCounters.set(redisKey, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return { allowed: true, remaining: limit - 1 };
    }

    entry.count++;
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: limit - entry.count };
  }

  /**
   * Quota validation for expensive operations (AI, Email, Autopilot)
   */
  async checkQuota(
    orgId: string,
    userId?: string,
    operation: 'AI_CHAT' | 'AI_EMBEDDING' | 'EMAIL_SEND' | 'AUTOPILOT_RUN' = 'AI_CHAT',
  ): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
    const date = this.getDateKey();

    if (operation === 'AI_CHAT' || operation === 'AI_EMBEDDING') {
      // 1. Check User Daily AI limit
      if (userId) {
        const userKey = `quota:ai:user:${userId}:${date}`;
        const userCount = await this.getCounter(userKey);
        if (userCount >= DEFAULT_QUOTAS.aiDailyPerUser) {
          return {
            allowed: false,
            reason: `User daily AI quota exceeded (${userCount}/${DEFAULT_QUOTAS.aiDailyPerUser} requests). Resets at UTC midnight.`,
            current: userCount,
            limit: DEFAULT_QUOTAS.aiDailyPerUser,
          };
        }
      }

      // 2. Check Org Daily AI limit
      const orgKey = `quota:ai:org:${orgId}:${date}`;
      const orgCount = await this.getCounter(orgKey);
      if (orgCount >= DEFAULT_QUOTAS.aiDailyPerOrg) {
        return {
          allowed: false,
          reason: `Organization daily AI quota exceeded (${orgCount}/${DEFAULT_QUOTAS.aiDailyPerOrg} requests). Resets at UTC midnight.`,
          current: orgCount,
          limit: DEFAULT_QUOTAS.aiDailyPerOrg,
        };
      }
    }

    if (operation === 'EMAIL_SEND') {
      const emailKey = `quota:email:org:${orgId}:${date}`;
      const emailCount = await this.getCounter(emailKey);
      if (emailCount >= DEFAULT_QUOTAS.emailDailyPerOrg) {
        return {
          allowed: false,
          reason: `Organization daily Email send quota exceeded (${emailCount}/${DEFAULT_QUOTAS.emailDailyPerOrg} emails).`,
          current: emailCount,
          limit: DEFAULT_QUOTAS.emailDailyPerOrg,
        };
      }
    }

    if (operation === 'AUTOPILOT_RUN') {
      const apKey = `quota:autopilot:org:${orgId}:${date}`;
      const apCount = await this.getCounter(apKey);
      if (apCount >= DEFAULT_QUOTAS.autopilotDailyPerOrg) {
        return {
          allowed: false,
          reason: `Organization daily Autopilot execution quota exceeded (${apCount}/${DEFAULT_QUOTAS.autopilotDailyPerOrg} runs).`,
          current: apCount,
          limit: DEFAULT_QUOTAS.autopilotDailyPerOrg,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Increments the operation counter upon successful execution
   */
  async incrementUsage(
    orgId: string,
    userId?: string,
    operation: 'AI_CHAT' | 'AI_EMBEDDING' | 'EMAIL_SEND' | 'AUTOPILOT_RUN' = 'AI_CHAT',
    count = 1,
  ): Promise<void> {
    const date = this.getDateKey();

    if (operation === 'AI_CHAT' || operation === 'AI_EMBEDDING') {
      if (userId) await this.incrCounter(`quota:ai:user:${userId}:${date}`, count);
      await this.incrCounter(`quota:ai:org:${orgId}:${date}`, count);
    } else if (operation === 'EMAIL_SEND') {
      await this.incrCounter(`quota:email:org:${orgId}:${date}`, count);
    } else if (operation === 'AUTOPILOT_RUN') {
      await this.incrCounter(`quota:autopilot:org:${orgId}:${date}`, count);
    }
  }

  /**
   * Returns current quota summary for tenant dashboard
   */
  async getUsageSummary(orgId: string, userId?: string) {
    const date = this.getDateKey();
    const [orgAi, userAi, email, autopilot] = await Promise.all([
      this.getCounter(`quota:ai:org:${orgId}:${date}`),
      userId ? this.getCounter(`quota:ai:user:${userId}:${date}`) : 0,
      this.getCounter(`quota:email:org:${orgId}:${date}`),
      this.getCounter(`quota:autopilot:org:${orgId}:${date}`),
    ]);

    return {
      date,
      ai: {
        orgUsed: orgAi,
        orgLimit: DEFAULT_QUOTAS.aiDailyPerOrg,
        userUsed: userAi,
        userLimit: DEFAULT_QUOTAS.aiDailyPerUser,
      },
      email: {
        used: email,
        limit: DEFAULT_QUOTAS.emailDailyPerOrg,
      },
      autopilot: {
        used: autopilot,
        limit: DEFAULT_QUOTAS.autopilotDailyPerOrg,
      },
    };
  }

  private async getCounter(key: string): Promise<number> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const val = await this.redis.get(key);
        return val ? parseInt(val, 10) : 0;
      } catch {}
    }

    const entry = this.memoryCounters.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return 0;
    return entry.count;
  }

  private async incrCounter(key: string, count = 1): Promise<void> {
    const oneDaySeconds = 86400;
    if (this.redis && this.redis.status === 'ready') {
      try {
        const newCount = await this.redis.incrby(key, count);
        if (newCount === count) await this.redis.expire(key, oneDaySeconds);
        return;
      } catch {}
    }

    const now = Date.now();
    const entry = this.memoryCounters.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.memoryCounters.set(key, { count, expiresAt: now + oneDaySeconds * 1000 });
    } else {
      entry.count += count;
    }
  }
}
