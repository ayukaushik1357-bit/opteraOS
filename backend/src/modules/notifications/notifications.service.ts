import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPriority, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string, userId: string, query: any = {}) {
    const { unreadOnly, priority, page = 1, pageSize = 30 } = query;
    const where: any = { organizationId: orgId, userId };
    if (unreadOnly === 'true' || unreadOnly === true) where.isRead = false;
    if (priority) where.priority = priority;

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async getUnreadCount(orgId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { organizationId: orgId, userId, isRead: false },
    });
    return { count };
  }

  async markRead(orgId: string, userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, organizationId: orgId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(orgId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { organizationId: orgId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, message: 'All notifications marked as read' };
  }

  async create(
    orgId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    entityType?: string,
    entityId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        organizationId: orgId,
        userId,
        type,
        priority,
        title,
        message,
        actionUrl: actionUrl || null,
        entityType: entityType || null,
        entityId: entityId || null,
      },
    });
  }

  async delete(orgId: string, userId: string, id: string) {
    await this.prisma.notification.deleteMany({
      where: { id, organizationId: orgId, userId },
    });
    return { success: true };
  }
}
