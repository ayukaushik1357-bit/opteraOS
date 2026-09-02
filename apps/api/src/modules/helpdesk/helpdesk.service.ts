import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus, TicketPriority } from '@prisma/client';

@Injectable()
export class HelpdeskService {
  constructor(private prisma: PrismaService) {}

  private async nextTicketNumber(orgId: string): Promise<string> {
    const count = await this.prisma.ticket.count({ where: { organizationId: orgId } });
    return `TICK-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(orgId: string, query: any = {}) {
    const { status, priority, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (status && status !== 'ALL') where.status = status as TicketStatus;
    if (priority && priority !== 'ALL') where.priority = priority as TicketPriority;
    if (customerId) where.customerId = customerId;

    const [rows, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { customer: true, comments: true },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async findOne(orgId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { customer: true, comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found');
    return ticket;
  }

  async create(orgId: string, dto: any) {
    const ticketNumber = await this.nextTicketNumber(orgId);
    return this.prisma.ticket.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId || null,
        ticketNumber,
        subject: dto.subject,
        description: dto.description || '',
        priority: (dto.priority as TicketPriority) || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        assigneeId: dto.assigneeId || null,
        category: dto.category || 'General Support',
      },
      include: { customer: true },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    return this.prisma.ticket.update({
      where: { id },
      data: dto,
      include: { customer: true, comments: true },
    });
  }

  async addComment(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    return this.prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: dto.userId || null,
        authorName: dto.authorName || 'Agent',
        content: dto.content,
        isInternal: Boolean(dto.isInternal),
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.ticket.delete({ where: { id } });
    return { success: true, message: 'Ticket deleted successfully' };
  }
}
