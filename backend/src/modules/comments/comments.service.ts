import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comments.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, entityType: string, entityId: string) {
    return this.prisma.comment.findMany({
      where: { organizationId: orgId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });
  }

  async create(
    orgId: string,
    userId: string,
    dto: CreateCommentDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const comment = await this.prisma.comment.create({
      data: {
        organizationId: orgId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        authorId: userId,
        content: dto.content,
        mentions: dto.mentions || null,
        metadata: dto.metadata || null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'comment.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'comment',
      resourceId: comment.id,
      newState: comment,
      requestId,
      source: 'comments-service',
      data: comment,
    });

    return comment;
  }

  async update(
    orgId: string,
    id: string,
    userId: string,
    dto: UpdateCommentDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.prisma.comment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Comment not found');
    if (existing.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: {
        content: dto.content,
        mentions: dto.mentions !== undefined ? dto.mentions : undefined,
        metadata: dto.metadata !== undefined ? dto.metadata : undefined,
        isEdited: true,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'comment.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'comment',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'comments-service',
      data: updated,
    });

    return updated;
  }

  async delete(
    orgId: string,
    id: string,
    userId: string,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.prisma.comment.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Comment not found');
    if (existing.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'comment.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'comment',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'comments-service',
    });

    return { success: true, message: 'Comment deleted' };
  }
}
