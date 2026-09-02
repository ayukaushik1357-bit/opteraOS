import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(orgId: string, query: any = {}) {
    const { status, priority, assigneeId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where, skip, take: Number(pageSize),
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          customer: { select: { id: true, name: true } },
          deal: { select: { id: true, title: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getStats(orgId: string) {
    const now = new Date();
    const [total, overdue, dueToday, completed] = await Promise.all([
      this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: now } } }),
      this.prisma.task.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { gte: new Date(now.setHours(0,0,0,0)), lt: new Date(now.setHours(23,59,59,999)) } } }),
      this.prisma.task.count({ where: { organizationId: orgId, status: 'COMPLETED' } }),
    ]);
    return { total, overdue, dueToday, completed };
  }

  async findOne(orgId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId: orgId }, include: { assignee: true, customer: true, deal: true, createdBy: true } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(orgId: string, userId: string, dto: any) {
    const task = await this.prisma.task.create({ data: { ...dto, organizationId: orgId, createdById: userId } });

    // Emits in-app notification to assignee if assigned to another user
    if (dto.assigneeId && dto.assigneeId !== userId) {
      await this.notifications.create(
        orgId,
        dto.assigneeId,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You have been assigned task: "${task.title}"`,
        `/tasks?id=${task.id}`,
      ).catch(() => {});
    }

    return task;
  }

  async update(orgId: string, id: string, dto: any) {
    const existing = await this.findOne(orgId, id);
    const data: any = { ...dto };
    if (dto.status === 'COMPLETED') data.completedAt = new Date();
    const updated = await this.prisma.task.update({ where: { id }, data });

    // Emits in-app notification if assignee changed
    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.notifications.create(
        orgId,
        dto.assigneeId,
        'TASK_ASSIGNED',
        'Task Reassigned to You',
        `You have been assigned task: "${updated.title}"`,
        `/tasks?id=${updated.id}`,
      ).catch(() => {});
    }

    return updated;
  }

  async complete(orgId: string, id: string) {
    return this.update(orgId, id, { status: 'COMPLETED' });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.task.delete({ where: { id } });
    return { message: 'Task deleted' };
  }
}
