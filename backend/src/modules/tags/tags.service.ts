import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateTagDto, AttachTagDto } from './dto/tags.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, category?: string) {
    const where: any = { organizationId: orgId };
    if (category) where.category = category;
    return this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { entityTags: true } } },
    });
  }

  async create(orgId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { organizationId_name: { organizationId: orgId, name: dto.name.trim() } },
    });
    if (existing) throw new ConflictException(`Tag "${dto.name}" already exists in this organization`);

    return this.prisma.tag.create({
      data: {
        organizationId: orgId,
        name: dto.name.trim(),
        color: dto.color || '#6366F1',
        category: dto.category || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async delete(orgId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, organizationId: orgId } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
    return { success: true, message: 'Tag deleted' };
  }

  async attachToEntity(orgId: string, dto: AttachTagDto) {
    const tag = await this.prisma.tag.findFirst({ where: { id: dto.tagId, organizationId: orgId } });
    if (!tag) throw new NotFoundException('Tag not found in this organization');

    const existing = await this.prisma.entityTag.findFirst({
      where: {
        organizationId: orgId,
        tagId: dto.tagId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
    if (existing) return existing;

    return this.prisma.entityTag.create({
      data: {
        organizationId: orgId,
        tagId: dto.tagId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
      include: { tag: true },
    });
  }

  async detachFromEntity(orgId: string, tagId: string, entityType: string, entityId: string) {
    await this.prisma.entityTag.deleteMany({
      where: { organizationId: orgId, tagId, entityType, entityId },
    });
    return { success: true, message: 'Tag detached' };
  }

  async getEntityTags(orgId: string, entityType: string, entityId: string) {
    return this.prisma.entityTag.findMany({
      where: { organizationId: orgId, entityType, entityId },
      include: { tag: true },
    });
  }
}
