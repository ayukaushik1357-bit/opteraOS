import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getTree(orgId: string) {
    const companies = await this.prisma.company.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
    return { data: companies };
  }

  async findOne(orgId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(orgId: string, dto: any) {
    return this.prisma.company.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId || null,
        name: dto.name,
        industry: dto.industry || null,
        website: dto.website || null,
        phone: dto.phone || null,
        email: dto.email || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        country: dto.country || 'IN',
        size: dto.size || null,
      },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.company.delete({ where: { id } });
    return { success: true, message: 'Company deleted successfully' };
  }
}
