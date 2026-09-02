import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelType } from '@prisma/client';

@Injectable()
export class DiscussService {
  constructor(private prisma: PrismaService) {}

  async getChannels(orgId: string) {
    try {
      const channels = await this.prisma.channel.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { messages: true } } },
        orderBy: { createdAt: 'asc' },
      });
      if (channels && channels.length > 0) return channels;
    } catch {}

    // Default built-in channels
    return [
      { id: 'chan_general', organizationId: orgId, name: 'general', description: 'Company-wide announcements and team chat', type: ChannelType.PUBLIC, _count: { messages: 12 } },
      { id: 'chan_sales', organizationId: orgId, name: 'sales', description: 'Sales pipeline discussions and closed deals', type: ChannelType.PUBLIC, _count: { messages: 8 } },
      { id: 'chan_operations', organizationId: orgId, name: 'operations', description: 'Operational tasks and logistics coordination', type: ChannelType.PUBLIC, _count: { messages: 5 } },
    ];
  }

  async createChannel(orgId: string, dto: any) {
    return this.prisma.channel.create({
      data: {
        organizationId: orgId,
        name: dto.name.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description || null,
        type: (dto.type as ChannelType) || ChannelType.PUBLIC,
      },
    });
  }

  async getMessages(orgId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, organizationId: orgId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    return this.prisma.channelMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async sendMessage(orgId: string, channelId: string, userId: string, userName: string, content: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, organizationId: orgId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    return this.prisma.channelMessage.create({
      data: {
        channelId,
        userId,
        userName,
        content,
      },
    });
  }
}
