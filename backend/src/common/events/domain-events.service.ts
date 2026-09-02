import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActorType } from '@prisma/client';

export interface DomainEventPayload<T = any> {
  eventName: string;
  organizationId: string;
  userId?: string | null;
  actorType?: ActorType;
  resource: string;
  resourceId?: string;
  oldState?: any;
  newState?: any;
  requestId?: string;
  source?: string;
  metadata?: any;
  data?: T;
}

type EventListener<T = any> = (payload: DomainEventPayload<T>) => void | Promise<void>;

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  private listeners = new Map<string, Set<EventListener>>();

  constructor(private readonly prisma: PrismaService) {}

  on<T = any>(eventName: string, listener: EventListener<T>) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener);
  }

  off<T = any>(eventName: string, listener: EventListener<T>) {
    const set = this.listeners.get(eventName);
    if (set) {
      set.delete(listener);
    }
  }

  async emit<T = any>(payload: DomainEventPayload<T>): Promise<void> {
    const {
      eventName,
      organizationId,
      userId,
      actorType = ActorType.USER,
      resource,
      resourceId,
      oldState,
      newState,
      requestId,
      source = 'optera-api',
      metadata,
    } = payload;

    this.logger.log(`[DomainEvent] ${eventName} | Org: ${organizationId} | Resource: ${resource}#${resourceId || ''} | RequestId: ${requestId || ''}`);

    // Asynchronously record Audit Log
    try {
      if (organizationId) {
        await this.prisma.auditLog.create({
          data: {
            organizationId,
            userId: userId || null,
            actorType,
            action: eventName,
            resource,
            resourceId: resourceId || null,
            oldState: oldState ? JSON.parse(JSON.stringify(oldState)) : null,
            newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
            requestId: requestId || null,
            source,
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to record audit log for event ${eventName}: ${err.message}`, err.stack);
    }

    // Dispatch to registered in-process listeners
    const handlers = this.listeners.get(eventName);
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          await handler(payload);
        } catch (err: any) {
          this.logger.error(`Error in event listener for ${eventName}: ${err.message}`, err.stack);
        }
      }
    }
  }

  /**
   * Convenience helper to publish events with simple payload object
   */
  async publish<T = any>(eventName: string, data: any): Promise<void> {
    const orgId = data?.orgId || data?.organizationId || '';
    const userId = data?.userId || null;
    const resource = eventName.split('.')[0] || 'domain';
    const resourceId = data?.id || data?.leadId || data?.opportunityId || data?.quotationId || data?.orderId || null;

    return this.emit({
      eventName,
      organizationId: orgId,
      userId,
      resource,
      resourceId,
      data,
    });
  }
}
