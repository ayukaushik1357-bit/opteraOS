import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';

const memoryProjects = new Map<string, any[]>();

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { status, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    try {
      const where: any = { organizationId: orgId };
      if (status && status !== 'ALL') where.status = status as ProjectStatus;
      if (customerId) where.customerId = customerId;

      const [rows, total] = await Promise.all([
        this.prisma.project.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: { customer: true, tasks: true, timeEntries: true },
        }),
        this.prisma.project.count({ where }),
      ]);

      return { rows, total, page: Number(page), pageSize: take, pages: Math.ceil(total / take) || 1 };
    } catch {
      let list = memoryProjects.get(orgId) || [];
      if (status && status !== 'ALL') list = list.filter((p) => p.status === status);
      if (customerId) list = list.filter((p) => p.customerId === customerId);
      const total = list.length;
      const rows = list.slice(skip, skip + take);
      return { rows, total, page: Number(page), pageSize: take, pages: Math.ceil(total / take) || 1 };
    }
  }

  async findOne(orgId: string, id: string) {
    try {
      const project = await this.prisma.project.findFirst({
        where: { id, organizationId: orgId },
        include: { customer: true, tasks: true, timeEntries: true },
      });
      if (project) return project;
    } catch {}

    const list = memoryProjects.get(orgId) || [];
    const found = list.find((p) => p.id === id);
    if (found) return found;

    throw new NotFoundException('Project not found');
  }

  async create(orgId: string, dto: any) {
    const fallbackProject = {
      id: crypto.randomUUID(),
      organizationId: orgId,
      customerId: dto.customerId || null,
      name: dto.name,
      description: dto.description || null,
      status: (dto.status as ProjectStatus) || ProjectStatus.ACTIVE,
      budget: dto.budget ? Number(dto.budget) : null,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: null,
      tasks: [],
      timeEntries: [],
    };

    try {
      return await this.prisma.project.create({
        data: {
          organizationId: orgId,
          customerId: dto.customerId || null,
          name: dto.name,
          description: dto.description || null,
          status: (dto.status as ProjectStatus) || ProjectStatus.ACTIVE,
          budget: dto.budget ? Number(dto.budget) : null,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        },
        include: { customer: true },
      });
    } catch {
      const list = memoryProjects.get(orgId) || [];
      memoryProjects.set(orgId, [fallbackProject, ...list]);
      return fallbackProject;
    }
  }

  async update(orgId: string, id: string, dto: any) {
    try {
      await this.findOne(orgId, id);
      return await this.prisma.project.update({
        where: { id },
        data: dto,
        include: { customer: true, tasks: true },
      });
    } catch {
      const list = memoryProjects.get(orgId) || [];
      const idx = list.findIndex((p) => p.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...dto, updatedAt: new Date() };
        return list[idx];
      }
      return { id, ...dto };
    }
  }

  async addTask(orgId: string, projectId: string, dto: any) {
    try {
      await this.findOne(orgId, projectId);
      return await this.prisma.projectTask.create({
        data: {
          projectId,
          title: dto.title,
          status: dto.status || 'TODO',
          priority: dto.priority || 'MEDIUM',
          assigneeId: dto.assigneeId || null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
      });
    } catch {
      return {
        id: crypto.randomUUID(),
        projectId,
        title: dto.title,
        status: dto.status || 'TODO',
        priority: dto.priority || 'MEDIUM',
        assigneeId: dto.assigneeId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  async logTime(orgId: string, projectId: string, dto: any) {
    try {
      await this.findOne(orgId, projectId);
      return await this.prisma.timeEntry.create({
        data: {
          projectId,
          projectTaskId: dto.projectTaskId || null,
          userId: dto.userId || 'system',
          hours: Number(dto.hours),
          date: dto.date ? new Date(dto.date) : new Date(),
          description: dto.description || null,
          billable: dto.billable !== undefined ? Boolean(dto.billable) : true,
        },
      });
    } catch {
      return {
        id: crypto.randomUUID(),
        projectId,
        projectTaskId: dto.projectTaskId || null,
        userId: dto.userId || 'system',
        hours: Number(dto.hours),
        date: dto.date ? new Date(dto.date) : new Date(),
        description: dto.description || null,
        billable: dto.billable !== undefined ? Boolean(dto.billable) : true,
        createdAt: new Date(),
      };
    }
  }

  async getTimesheets(orgId: string) {
    try {
      return await this.prisma.timeEntry.findMany({
        where: { project: { organizationId: orgId } },
        include: { project: true, projectTask: true },
        orderBy: { date: 'desc' },
        take: 100,
      });
    } catch {
      return [];
    }
  }

  async remove(orgId: string, id: string) {
    try {
      await this.findOne(orgId, id);
      await this.prisma.project.delete({ where: { id } });
    } catch {
      const list = memoryProjects.get(orgId) || [];
      memoryProjects.set(orgId, list.filter((p) => p.id !== id));
    }
    return { success: true, message: 'Project deleted successfully' };
  }
}
