import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateCompanyDto, UpdateCompanyDto, QueryCompaniesDto } from './dto/companies.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: QueryCompaniesDto = {}) {
    const { search, industry, relationshipType, status, page = 1, pageSize = 30 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = { organizationId: orgId };
    if (industry) where.industry = industry;
    if (relationshipType) where.relationshipType = relationshipType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { legalName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { displayName: 'asc' },
        include: {
          parentCompany: { select: { id: true, displayName: true, legalName: true } },
          _count: { select: { contacts: true, subsidiaries: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async findById(orgId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId: orgId },
      include: {
        parentCompany: true,
        subsidiaries: true,
        contacts: true,
      },
    });
    if (!company) {
      throw new NotFoundException(`Company with id ${id} not found`);
    }
    return company;
  }

  async getHierarchyTree(orgId: string) {
    // Get all root companies (no parent) and their nested subsidiaries
    return this.prisma.company.findMany({
      where: { organizationId: orgId, parentCompanyId: null },
      include: {
        subsidiaries: {
          include: {
            subsidiaries: true,
            contacts: { select: { id: true, name: true, email: true, jobTitle: true } },
          },
        },
        contacts: { select: { id: true, name: true, email: true, jobTitle: true } },
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateCompanyDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const displayName = dto.displayName || dto.legalName;

    const company = await this.prisma.company.create({
      data: {
        organizationId: orgId,
        parentCompanyId: dto.parentCompanyId || null,
        legalName: dto.legalName,
        displayName,
        taxIdentifiers: dto.taxIdentifiers || null,
        registrationIdentifiers: dto.registrationIdentifiers || null,
        industry: dto.industry || null,
        companySize: dto.companySize || null,
        website: dto.website || null,
        email: dto.email ? dto.email.toLowerCase() : null,
        phone: dto.phone || null,
        relationshipType: dto.relationshipType || 'CUSTOMER',
        status: dto.status || 'ACTIVE',
        notes: dto.notes || null,
        customFields: dto.customFields || null,
      },
      include: {
        parentCompany: { select: { id: true, displayName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'company.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'company',
      resourceId: company.id,
      newState: company,
      requestId,
      source: 'companies-service',
      data: company,
    });

    return company;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateCompanyDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email !== undefined ? (dto.email ? dto.email.toLowerCase() : null) : undefined,
      },
      include: {
        parentCompany: { select: { id: true, displayName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'company.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'company',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'companies-service',
      data: updated,
    });

    return updated;
  }

  async delete(
    orgId: string,
    id: string,
    userId: string | null,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);
    await this.prisma.company.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'company.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'company',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'companies-service',
    });

    return { success: true, message: 'Company deleted successfully' };
  }
}
