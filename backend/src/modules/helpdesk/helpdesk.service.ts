import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus, TicketPriority } from '@prisma/client';

@Injectable()
export class HelpdeskService {
  constructor(private prisma: PrismaService) {}

  async getTickets(orgId: string, query: { status?: TicketStatus; priority?: TicketPriority; search?: string; page?: number; pageSize?: number } = {}) {
    const { status, priority, search, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true, company: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getTicket(orgId: string, id: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id, organizationId: orgId },
      include: { customer: true, assignee: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async createTicket(orgId: string, dto: {
    subject: string;
    description: string;
    customerId?: string;
    assigneeId?: string;
    priority?: TicketPriority;
    slaHours?: number;
  }) {
    const count = await this.prisma.helpdeskTicket.count({ where: { organizationId: orgId } });
    const ticketNumber = `TICK-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.helpdeskTicket.create({
      data: {
        organizationId: orgId,
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        customerId: dto.customerId,
        assigneeId: dto.assigneeId,
        priority: dto.priority || TicketPriority.MEDIUM,
        status: TicketStatus.NEW,
        slaHours: dto.slaHours || 24,
      },
      include: { customer: true, assignee: true },
    });
  }

  async updateTicket(orgId: string, id: string, dto: any) {
    await this.getTicket(orgId, id);
    const data: any = { ...dto };
    if (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) {
      data.resolvedAt = new Date();
    }
    return this.prisma.helpdeskTicket.update({ where: { id }, data, include: { customer: true, assignee: true } });
  }

  async resolveTicket(orgId: string, id: string) {
    return this.updateTicket(orgId, id, { status: TicketStatus.RESOLVED });
  }
}
