import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePipelineDto, UpdatePipelineDto, CreatePipelineStageDto, UpdatePipelineStageDto } from './dto/pipelines.dto';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns all pipelines for an organization.
   * Auto-provisions a default sales pipeline if none exists.
   */
  async findAll(orgId: string) {
    let pipelines = await this.prisma.pipeline.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        stages: { orderBy: { orderIndex: 'asc' } },
        salesTeam: { select: { id: true, name: true } },
        _count: { select: { deals: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });

    if (pipelines.length === 0) {
      const defaultPipeline = await this.createDefaultPipeline(orgId);
      pipelines = [defaultPipeline as any];
    }

    return pipelines;
  }

  async findOne(orgId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId: orgId },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            _count: { select: { deals: true } },
          },
        },
        salesTeam: true,
      },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async create(orgId: string, dto: CreatePipelineDto) {
    const { stages, ...pipelineData } = dto;

    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const defaultStages: CreatePipelineStageDto[] = stages && stages.length > 0 ? stages : [
      { name: 'New', orderIndex: 0, probability: 10, color: '#3B82F6' },
      { name: 'Qualified', orderIndex: 1, probability: 30, color: '#6366F1' },
      { name: 'Proposal', orderIndex: 2, probability: 60, color: '#8B5CF6' },
      { name: 'Negotiation', orderIndex: 3, probability: 80, color: '#EC4899' },
      { name: 'Won', orderIndex: 4, probability: 100, isWon: true, color: '#10B981' },
      { name: 'Lost', orderIndex: 5, probability: 0, isLost: true, color: '#EF4444' },
    ];

    return this.prisma.pipeline.create({
      data: {
        ...pipelineData,
        organizationId: orgId,
        stages: {
          create: defaultStages.map((s, idx) => ({
            organizationId: orgId,
            name: s.name,
            code: s.code,
            orderIndex: s.orderIndex ?? idx,
            probability: s.probability ?? 0,
            requirements: s.requirements,
            isWon: s.isWon ?? false,
            isLost: s.isLost ?? false,
            color: s.color ?? '#6366F1',
          })),
        },
      },
      include: { stages: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async update(orgId: string, id: string, dto: UpdatePipelineDto) {
    await this.findOne(orgId, id);

    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.pipeline.update({
      where: { id },
      data: dto,
      include: { stages: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async remove(orgId: string, id: string) {
    const pipeline = await this.findOne(orgId, id);
    const count = await this.prisma.pipeline.count({ where: { organizationId: orgId, isActive: true } });
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the only active pipeline.');
    }

    await this.prisma.pipeline.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Pipeline deactivated' };
  }

  async addStage(orgId: string, pipelineId: string, dto: CreatePipelineStageDto) {
    await this.findOne(orgId, pipelineId);
    const stageCount = await this.prisma.pipelineStage.count({ where: { pipelineId } });

    return this.prisma.pipelineStage.create({
      data: {
        ...dto,
        organizationId: orgId,
        pipelineId,
        orderIndex: dto.orderIndex ?? stageCount,
      },
    });
  }

  async updateStage(orgId: string, pipelineId: string, stageId: string, dto: UpdatePipelineStageDto) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId: orgId },
    });
    if (!stage) throw new NotFoundException('Pipeline stage not found');

    return this.prisma.pipelineStage.update({
      where: { id: stageId },
      data: dto,
    });
  }

  async removeStage(orgId: string, pipelineId: string, stageId: string) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId, organizationId: orgId },
      include: { _count: { select: { deals: true } } },
    });
    if (!stage) throw new NotFoundException('Pipeline stage not found');

    if (stage._count.deals > 0) {
      throw new BadRequestException(`Cannot delete stage with ${stage._count.deals} active deals. Move deals first.`);
    }

    await this.prisma.pipelineStage.delete({ where: { id: stageId } });
    return { message: 'Stage removed' };
  }

  private async createDefaultPipeline(orgId: string) {
    return this.prisma.pipeline.create({
      data: {
        organizationId: orgId,
        name: 'Standard Sales Pipeline',
        code: 'STANDARD',
        isDefault: true,
        stages: {
          create: [
            { organizationId: orgId, name: 'New', orderIndex: 0, probability: 10, color: '#3B82F6' },
            { organizationId: orgId, name: 'Qualified', orderIndex: 1, probability: 30, color: '#6366F1' },
            { organizationId: orgId, name: 'Proposal', orderIndex: 2, probability: 60, color: '#8B5CF6' },
            { organizationId: orgId, name: 'Negotiation', orderIndex: 3, probability: 80, color: '#EC4899' },
            { organizationId: orgId, name: 'Won', orderIndex: 4, probability: 100, isWon: true, color: '#10B981' },
            { organizationId: orgId, name: 'Lost', orderIndex: 5, probability: 0, isLost: true, color: '#EF4444' },
          ],
        },
      },
      include: { stages: { orderBy: { orderIndex: 'asc' } }, _count: { select: { deals: true } } },
    });
  }
}
