import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, customerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (customerId) where.customerId = customerId;
    if (search?.trim()) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, company: true } } },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async findOne(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: orgId },
      include: { customer: true },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(orgId: string, dto: any) {
    return this.prisma.contact.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId || null,
        firstName: dto.firstName,
        lastName: dto.lastName || null,
        email: dto.email || null,
        phone: dto.phone || null,
        jobTitle: dto.jobTitle || null,
        department: dto.department || null,
        isPrimary: Boolean(dto.isPrimary),
        notes: dto.notes || null,
      },
      include: { customer: true },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    return this.prisma.contact.update({
      where: { id },
      data: dto,
      include: { customer: true },
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.contact.delete({ where: { id } });
    return { success: true, message: 'Contact deleted successfully' };
  }
}
