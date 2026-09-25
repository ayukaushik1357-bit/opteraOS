import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, userId: string, query: any = {}) {
    const { unreadOnly, page = 1, pageSize = 30 } = query;
    const where: any = { organizationId: orgId, userId };
    if (unreadOnly === 'true') where.isRead = false;
    return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (Number(page) - 1) * Number(pageSize), take: Number(pageSize) });
  }

  async getUnreadCount(orgId: string, userId: string) {
    const count = await this.prisma.notification.count({ where: { organizationId: orgId, userId, isRead: false } });
    return { count };
  }

  async markRead(orgId: string, userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, organizationId: orgId, userId }, data: { isRead: true } });
  }

  async markAllRead(orgId: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { organizationId: orgId, userId, isRead: false }, data: { isRead: true } });
    return { message: 'All notifications marked as read' };
  }

  async create(orgId: string, userId: string, type: any, title: string, message: string, actionUrl?: string) {
    return this.prisma.notification.create({ data: { organizationId: orgId, userId, type, title, message, actionUrl } });
  }
}
