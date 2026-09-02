import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateContactDto, UpdateContactDto, QueryContactsDto } from './dto/contacts.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: QueryContactsDto = {}) {
    const { search, companyId, type, status, page = 1, pageSize = 30 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = { organizationId: orgId };
    if (companyId) where.companyId = companyId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, displayName: true, legalName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.contact.count({ where }),
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
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId: orgId },
      include: {
        company: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!contact) {
      throw new NotFoundException(`Contact with id ${id} not found in this organization`);
    }
    return contact;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateContactDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const name = dto.name || `${dto.firstName} ${dto.lastName || ''}`.trim();

    const contact = await this.prisma.contact.create({
      data: {
        organizationId: orgId,
        companyId: dto.companyId || null,
        type: dto.type,
        firstName: dto.firstName,
        lastName: dto.lastName || null,
        name,
        email: dto.email ? dto.email.toLowerCase() : null,
        phone: dto.phone || null,
        mobile: dto.mobile || null,
        jobTitle: dto.jobTitle || null,
        website: dto.website || null,
        tags: dto.tags || [],
        notes: dto.notes || null,
        language: dto.language || 'en',
        timezone: dto.timezone || 'UTC',
        status: dto.status || 'ACTIVE',
        customFields: dto.customFields || null,
        createdById: userId || null,
      },
      include: {
        company: { select: { id: true, displayName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'contact.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'contact',
      resourceId: contact.id,
      newState: contact,
      requestId,
      source: 'contacts-service',
      data: contact,
    });

    return contact;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateContactDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    let name = dto.name;
    if (!name && (dto.firstName || dto.lastName)) {
      const first = dto.firstName || existing.firstName;
      const last = dto.lastName !== undefined ? dto.lastName : existing.lastName;
      name = `${first} ${last || ''}`.trim();
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        ...dto,
        ...(name ? { name } : {}),
        email: dto.email !== undefined ? (dto.email ? dto.email.toLowerCase() : null) : undefined,
      },
      include: {
        company: { select: { id: true, displayName: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'contact.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'contact',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'contacts-service',
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
    await this.prisma.contact.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'contact.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'contact',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'contacts-service',
    });

    return { success: true, message: 'Contact deleted successfully' };
  }
}
