import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateAddressDto, UpdateAddressDto, QueryAddressesDto } from './dto/addresses.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: QueryAddressesDto = {}) {
    const where: any = { organizationId: orgId };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.addressType) where.addressType = query.addressType;

    return this.prisma.address.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(orgId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateAddressDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    // If set as default, reset other default addresses for the same entity
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: {
          organizationId: orgId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        organizationId: orgId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        addressType: dto.addressType,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 || null,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'IN',
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: dto.isDefault ?? false,
      },
    });

    await this.domainEvents.emit({
      eventName: 'address.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'address',
      resourceId: address.id,
      newState: address,
      requestId,
      source: 'addresses-service',
      data: address,
    });

    return address;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateAddressDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: {
          organizationId: orgId,
          entityType: existing.entityType,
          entityId: existing.entityId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id },
      data: dto,
    });

    await this.domainEvents.emit({
      eventName: 'address.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'address',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'addresses-service',
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
    await this.prisma.address.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'address.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'address',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'addresses-service',
    });

    return { success: true, message: 'Address deleted successfully' };
  }
}
