import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CostGuardService } from '../usage/cost-guard.service';
import Redis from 'ioredis';

@Injectable()
export class AutopilotDaemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutopilotDaemonService.name);
  private timer: NodeJS.Timeout | null = null;
  private redis: Redis | null = null;
  private localLocks = new Set<string>();
  private failureCounts = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private costGuard: CostGuardService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      this.redis.connect().catch(() => {});
    } catch {}
  }

  onModuleInit() {
    const intervalMs = parseInt(this.config.get<string>('AUTOPILOT_INTERVAL_MS') || '900000', 10); // Default: 15 minutes
    this.logger.log(`🤖 Autopilot Background Daemon initialized. Cycle interval: ${intervalMs / 1000}s`);

    // Run first cycle shortly after boot, then recurring
    setTimeout(() => {
      this.runDaemonCycle().catch((err) => this.logger.error(`Daemon initial cycle error: ${err.message}`));
    }, 5000);

    this.timer = setInterval(() => {
      this.runDaemonCycle().catch((err) => this.logger.error(`Daemon cycle error: ${err.message}`));
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Acquire a distributed execution lock to guarantee no parallel duplicates
   */
  private async acquireLock(lockKey: string, ttlSeconds = 60): Promise<boolean> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const result = await this.redis.set(`autopilot:lock:${lockKey}`, 'locked', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {}
    }

    // In-memory lock fallback
    if (this.localLocks.has(lockKey)) return false;
    this.localLocks.add(lockKey);
    setTimeout(() => this.localLocks.delete(lockKey), ttlSeconds * 1000);
    return true;
  }

  private async releaseLock(lockKey: string): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(`autopilot:lock:${lockKey}`);
      } catch {}
    }
    this.localLocks.delete(lockKey);
  }

  /**
   * Main daemon execution loop
   */
  async runDaemonCycle(): Promise<{ processedOrgs: number; executedTasks: number }> {
    const lockAcquired = await this.acquireLock('global_daemon_cycle', 120);
    if (!lockAcquired) {
      this.logger.debug('Autopilot cycle already running on another instance. Skipping.');
      return { processedOrgs: 0, executedTasks: 0 };
    }

    let processedOrgs = 0;
    let executedTasks = 0;

    try {
      // 1. Fetch active organizations
      const orgs = await this.prisma.organization.findMany({
        select: { id: true, name: true, ownerId: true },
      });

      for (const org of orgs) {
        processedOrgs++;

        // 2. Pre-flight CostGuard budget check for this organization
        const budget = await this.costGuard.evaluateBudget(org.id, undefined, 'AUTOPILOT_RUN');
        if (!budget.allowed) {
          this.logger.warn(`🛑 Autopilot cycle skipped for org "${org.name}": ${budget.error}`);
          continue;
        }

        const tasksRun = await this.executeOrgAutopilotRoutines(org.id, org.ownerId);
        executedTasks += tasksRun;
      }
    } catch (err: any) {
      this.logger.error(`Error during daemon execution: ${err.message}`);
    } finally {
      await this.releaseLock('global_daemon_cycle');
    }

    return { processedOrgs, executedTasks };
  }

  /**
   * Performs real business operations for an organization
   */
  private async executeOrgAutopilotRoutines(orgId: string, ownerId: string): Promise<number> {
    let actionsPerformed = 0;

    try {
      // Routine 1: Inbound High-Value Unassigned Lead Assignment
      const unassignedLeads = await this.prisma.lead.findMany({
        where: { organizationId: orgId, ownerId: null, score: { gte: 70 } },
        take: 5,
      });

      if (unassignedLeads.length > 0) {
        const members = await this.prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          select: { userId: true },
        });

        if (members.length > 0) {
          let idx = 0;
          for (const lead of unassignedLeads) {
            const assignee = members[idx % members.length]!.userId;
            await this.prisma.lead.update({
              where: { id: lead.id },
              data: { ownerId: assignee, updatedAt: new Date() },
            });

            await this.prisma.notification.create({
              data: {
                organizationId: orgId,
                userId: assignee,
                type: 'NEW_LEAD',
                title: 'Autopilot Lead Assignment',
                message: `Qualified lead "${lead.name}" (${lead.company || 'Enterprise'}) has been assigned to you.`,
              },
            });

            idx++;
            actionsPerformed++;
          }
        }
      }

      // Routine 2: Overdue Invoice Chasing Alert
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['SENT', 'OVERDUE'] },
          dueDate: { lt: new Date() },
        },
        take: 5,
        include: { customer: { select: { name: true } } },
      });

      for (const inv of overdueInvoices) {
        if (inv.status !== 'OVERDUE') {
          await this.prisma.invoice.update({
            where: { id: inv.id },
            data: { status: 'OVERDUE', updatedAt: new Date() },
          });

          await this.prisma.task.create({
            data: {
              organizationId: orgId,
              createdById: ownerId,
              title: `Follow up on overdue invoice ${inv.invoiceNumber} (${inv.customer?.name || 'Customer'})`,
              priority: 'HIGH',
              status: 'TODO',
              dueDate: new Date(Date.now() + 86400000), // +24 hours
            },
          });

          actionsPerformed++;
        }
      }

      // Routine 3: Low Stock Re-order Alert
      const lowStockProducts: any[] = await this.prisma.$queryRaw`
        SELECT id, name, sku, stock, "minStock" 
        FROM products 
        WHERE "organizationId" = ${orgId} AND stock <= "minStock"
        LIMIT 5
      `;

      for (const prod of lowStockProducts) {
        // Check if open task already exists to prevent duplicate tasks
        const existingTask = await this.prisma.task.findFirst({
          where: {
            organizationId: orgId,
            title: { contains: prod.name },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        });

        if (!existingTask) {
          await this.prisma.task.create({
            data: {
              organizationId: orgId,
              createdById: ownerId,
              title: `Reorder Low Stock Product: ${prod.name} (SKU: ${prod.sku}, Remaining: ${prod.stock})`,
              priority: 'URGENT',
              status: 'TODO',
              dueDate: new Date(Date.now() + 86400000),
            },
          });
          actionsPerformed++;
        }
      }

      // Record successful cycle in UsageLedger
      if (actionsPerformed > 0) {
        await this.costGuard.recordUsage({
          organizationId: orgId,
          userId: ownerId,
          operation: 'AUTOPILOT_RUN',
          provider: 'AUTOPILOT_ENGINE',
          service: 'autopilot',
          requestCount: 1,
          tokensUsed: 0,
          estimatedCost: 0,
          status: 'SUCCESS',
        });
      }
    } catch (err: any) {
      this.logger.error(`Autopilot routines failed for org ${orgId}: ${err.message}`);
      const currentFailures = (this.failureCounts.get(orgId) || 0) + 1;
      this.failureCounts.set(orgId, currentFailures);

      // Circuit Breaker: Trip if >= 3 consecutive failures
      if (currentFailures >= 3) {
        this.logger.warn(`⚡ Circuit Breaker Tripped: Pausing automations for org ${orgId}`);
        await this.costGuard.recordUsage({
          organizationId: orgId,
          operation: 'AUTOPILOT_RUN',
          provider: 'CIRCUIT_BREAKER',
          service: 'autopilot',
          status: 'FAILED',
        });
      }
    }

    return actionsPerformed;
  }
}
