import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  SetCustomFieldValueDto,
} from './dto/custom-fields.dto';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefinitions(orgId: string, entityType?: string) {
    const where: any = { organizationId: orgId };
    if (entityType) where.entityType = entityType;
    return this.prisma.customFieldDefinition.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createDefinition(orgId: string, dto: CreateCustomFieldDefinitionDto) {
    const existing = await this.prisma.customFieldDefinition.findUnique({
      where: {
        organizationId_entityType_fieldKey: {
          organizationId: orgId,
          entityType: dto.entityType,
          fieldKey: dto.fieldKey.trim(),
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Field key "${dto.fieldKey}" already exists for entity ${dto.entityType}`,
      );
    }

    return this.prisma.customFieldDefinition.create({
      data: {
        organizationId: orgId,
        entityType: dto.entityType,
        fieldKey: dto.fieldKey.trim(),
        label: dto.label,
        fieldType: dto.fieldType || 'TEXT',
        isRequired: dto.isRequired ?? false,
        defaultValue: dto.defaultValue || null,
        options: dto.options || null,
        validationRules: dto.validationRules || null,
        isVisible: dto.isVisible ?? true,
        orderIndex: dto.orderIndex || 0,
      },
    });
  }

  async updateDefinition(orgId: string, id: string, dto: UpdateCustomFieldDefinitionDto) {
    const existing = await this.prisma.customFieldDefinition.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Field definition not found');

    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: dto,
    });
  }

  async deleteDefinition(orgId: string, id: string) {
    const existing = await this.prisma.customFieldDefinition.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Field definition not found');
    await this.prisma.customFieldDefinition.delete({ where: { id } });
    return { success: true, message: 'Custom field definition deleted' };
  }

  async setFieldValue(orgId: string, dto: SetCustomFieldValueDto) {
    const def = await this.prisma.customFieldDefinition.findFirst({
      where: { id: dto.fieldDefinitionId, organizationId: orgId },
    });
    if (!def) throw new NotFoundException('Field definition not found');

    return this.prisma.customFieldValue.upsert({
      where: {
        fieldDefinitionId_entityId: {
          fieldDefinitionId: dto.fieldDefinitionId,
          entityId: dto.entityId,
        },
      },
      update: {
        valueText: dto.valueText ?? null,
        valueNumber: dto.valueNumber ?? null,
        valueBoolean: dto.valueBoolean ?? null,
        valueDate: dto.valueDate ? new Date(dto.valueDate) : null,
        valueJson: dto.valueJson ?? null,
      },
      create: {
        fieldDefinitionId: dto.fieldDefinitionId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        valueText: dto.valueText ?? null,
        valueNumber: dto.valueNumber ?? null,
        valueBoolean: dto.valueBoolean ?? null,
        valueDate: dto.valueDate ? new Date(dto.valueDate) : null,
        valueJson: dto.valueJson ?? null,
      },
    });
  }

  async getEntityFieldValues(orgId: string, entityType: string, entityId: string) {
    return this.prisma.customFieldValue.findMany({
      where: { entityType, entityId },
      include: { fieldDefinition: true },
    });
  }
}
