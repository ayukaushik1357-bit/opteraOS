import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  // ─── Projects ─────────────────────────────────────────────────────────────
  async getProjects(orgId: string, query: { status?: ProjectStatus; search?: string; page?: number; pageSize?: number } = {}) {
    const { status, search, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          manager: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { tasks: true, timesheets: true, fieldServiceOrders: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getProject(orgId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        manager: true,
        tasks: { include: { assignee: true } },
        timesheets: { include: { user: true } },
        fieldServiceOrders: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async createProject(orgId: string, dto: {
    name: string;
    code?: string;
    customerId?: string;
    managerId?: string;
    budget?: number;
    startDate?: string;
    deadline?: string;
    description?: string;
  }) {
    const count = await this.prisma.project.count({ where: { organizationId: orgId } });
    const code = dto.code || `PRJ-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.project.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        code,
        customerId: dto.customerId,
        managerId: dto.managerId,
        budget: dto.budget || 0,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        description: dto.description,
        status: ProjectStatus.IN_PROGRESS,
      },
      include: { customer: true, manager: true },
    });
  }

  async updateProject(orgId: string, id: string, dto: any) {
    await this.getProject(orgId, id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  // ─── Timesheets ───────────────────────────────────────────────────────────
  async getTimesheets(orgId: string, query: { projectId?: string; userId?: string; page?: number; pageSize?: number } = {}) {
    const { projectId, userId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;

    const [rows, total] = await Promise.all([
      this.prisma.timesheet.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { date: 'desc' },
        include: {
          project: { select: { id: true, name: true, code: true } },
          task: { select: { id: true, title: true } },
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.timesheet.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async logTimesheet(orgId: string, userId: string, dto: {
    projectId?: string;
    taskId?: string;
    date?: string;
    hours: number;
    description?: string;
    isBillable?: boolean;
  }) {
    return this.prisma.timesheet.create({
      data: {
        organizationId: orgId,
        userId,
        projectId: dto.projectId,
        taskId: dto.taskId,
        date: dto.date ? new Date(dto.date) : new Date(),
        hours: dto.hours,
        description: dto.description,
        isBillable: dto.isBillable ?? true,
      },
      include: { project: true, task: true, user: true },
    });
  }

  // ─── Field Service ────────────────────────────────────────────────────────
  async getFieldServiceOrders(orgId: string, query: { status?: string; page?: number; pageSize?: number } = {}) {
    const { status, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.fieldServiceOrder.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { customer: true, project: true },
      }),
      this.prisma.fieldServiceOrder.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async createFieldServiceOrder(orgId: string, dto: any) {
    const count = await this.prisma.fieldServiceOrder.count({ where: { organizationId: orgId } });
    const orderNumber = `FSO-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.fieldServiceOrder.create({
      data: {
        ...dto,
        organizationId: orgId,
        orderNumber,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
      },
      include: { customer: true },
    });
  }
}
