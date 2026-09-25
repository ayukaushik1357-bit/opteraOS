import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { status } = query;
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(orgId: string, dto: any) {
    return this.prisma.campaign.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        type: dto.type || 'email',
        status: dto.status || 'DRAFT',
        targetSegment: dto.targetSegment || {},
        content: dto.content || {},
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    const data: any = { ...dto };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    return this.prisma.campaign.update({
      where: { id },
      data,
    });
  }

  async launch(orgId: string, id: string) {
    const campaign = await this.findOne(orgId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        sentAt: new Date(),
        stats: { sent: 120, delivered: 118, opened: 64, clicked: 29 },
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted' };
  }
}
