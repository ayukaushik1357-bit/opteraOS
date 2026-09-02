import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateAttachmentDto } from './dto/attachments.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, entityType: string, entityId: string) {
    return this.prisma.attachment.findMany({
      where: { organizationId: orgId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async findById(orgId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, organizationId: orgId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateAttachmentDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const attachment = await this.prisma.attachment.create({
      data: {
        organizationId: orgId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey,
        storageProvider: dto.storageProvider || 'supabase',
        uploadedById: userId || null,
        metadata: dto.metadata || null,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'attachment.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'attachment',
      resourceId: attachment.id,
      newState: attachment,
      requestId,
      source: 'attachments-service',
      data: attachment,
    });

    return attachment;
  }

  async delete(
    orgId: string,
    id: string,
    userId: string | null,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);
    await this.prisma.attachment.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'attachment.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'attachment',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'attachments-service',
    });

    return { success: true, message: 'Attachment record deleted' };
  }
}
