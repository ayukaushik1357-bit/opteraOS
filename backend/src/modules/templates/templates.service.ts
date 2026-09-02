import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/templates.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, entityType?: string) {
    const where: any = { organizationId: orgId, isActive: true };
    if (entityType) where.entityType = entityType;
    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const tpl = await this.prisma.emailTemplate.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async findByCode(orgId: string, code: string) {
    return this.prisma.emailTemplate.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    });
  }

  async create(orgId: string, dto: CreateTemplateDto) {
    return this.prisma.emailTemplate.create({
      data: {
        ...dto,
        organizationId: orgId,
      },
    });
  }

  async update(orgId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(orgId, id);
    return this.prisma.emailTemplate.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Renders a template replacing {{key}} or {{object.property}} tags with context values.
   */
  render(templateText: string, context: Record<string, any>): string {
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
      const parts = path.split('.');
      let val = context;
      for (const part of parts) {
        if (val === undefined || val === null) return '';
        val = val[part];
      }
      return val !== undefined && val !== null ? String(val) : '';
    });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.emailTemplate.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Template deactivated' };
  }
}
