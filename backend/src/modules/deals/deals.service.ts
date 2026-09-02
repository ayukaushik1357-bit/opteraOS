import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateDealDto, UpdateDealDto, MoveDealStageDto, CloseDealDto } from './dto/deals.dto';
import { DealStage } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private events: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, stage, pipelineId, stageId, customerId, ownerId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (stage) where.stage = stage;
    if (pipelineId) where.pipelineId = pipelineId;
    if (stageId) where.stageId = stageId;
    if (customerId) where.customerId = customerId;
    if (ownerId) where.ownerId = ownerId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { company: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, company: true, email: true } },
          company: { select: { id: true, displayName: true, legalName: true } },
          contact: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          pipeline: { select: { id: true, name: true } },
          pipelineStage: { select: { id: true, name: true, probability: true, color: true, isWon: true, isLost: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async getPipeline(orgId: string, pipelineId?: string) {
    // Resolve target pipeline
    let targetPipelineId = pipelineId;
    if (!targetPipelineId) {
      const defaultPipe = await this.prisma.pipeline.findFirst({
        where: { organizationId: orgId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { orderIndex: 'asc' }],
      });
      targetPipelineId = defaultPipe?.id;
    }

    if (!targetPipelineId) {
      return { pipeline: null, stages: [] };
    }

    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: targetPipelineId, organizationId: orgId },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const deals = await this.prisma.deal.findMany({
      where: { organizationId: orgId, pipelineId: targetPipelineId },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        company: { select: { id: true, displayName: true } },
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { activities: true, quotations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stagesWithDeals = pipeline.stages.map((stage) => {
      const stageDeals = deals.filter((d) => d.stageId === stage.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
      const weightedValue = stageDeals.reduce((sum, d) => sum + Number(d.weightedRevenue || 0), 0);

      return {
        ...stage,
        deals: stageDeals,
        count: stageDeals.length,
        totalValue,
        weightedValue,
      };
    });

    return {
      pipeline: { id: pipeline.id, name: pipeline.name, isDefault: pipeline.isDefault },
      stages: stagesWithDeals,
    };
  }

  async getStats(orgId: string, query: any = {}) {
    const { pipelineId, period } = query;
    const where: any = { organizationId: orgId };
    if (pipelineId) where.pipelineId = pipelineId;

    const [total, won, lost, openDeals] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.findMany({ where: { ...where, stage: DealStage.WON } }),
      this.prisma.deal.findMany({ where: { ...where, stage: DealStage.LOST } }),
      this.prisma.deal.findMany({ where: { ...where, stage: { notIn: [DealStage.WON, DealStage.LOST] } } }),
    ]);

    const wonValue = won.reduce((acc, d) => acc + Number(d.value || 0), 0);
    const lostValue = lost.reduce((acc, d) => acc + Number(d.value || 0), 0);
    const openValue = openDeals.reduce((acc, d) => acc + Number(d.value || 0), 0);
    const weightedOpenValue = openDeals.reduce((acc, d) => acc + Number(d.weightedRevenue || 0), 0);

    const closedCount = won.length + lost.length;
    const winRate = closedCount > 0 ? Math.round((won.length / closedCount) * 100) : 0;

    return {
      totalDeals: total,
      openDeals: openDeals.length,
      wonDeals: won.length,
      lostDeals: lost.length,
      winRate,
      pipelineValue: openValue,
      weightedPipelineValue: weightedOpenValue,
      wonValue,
      lostValue,
    };
  }

  async findOne(orgId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        company: true,
        contact: true,
        pipeline: { include: { stages: { orderBy: { orderIndex: 'asc' } } } },
        pipelineStage: true,
        salesTeam: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        quotations: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!deal) throw new NotFoundException('Opportunity not found');
    return deal;
  }

  async create(orgId: string, userId: string, dto: CreateDealDto) {
    let pipelineId = dto.pipelineId;
    let stageId = dto.stageId;

    // Resolve pipeline and stage if not provided
    if (!pipelineId || !stageId) {
      const defaultPipeline = await this.prisma.pipeline.findFirst({
        where: { organizationId: orgId, isActive: true },
        include: { stages: { orderBy: { orderIndex: 'asc' }, take: 1 } },
      });
      if (defaultPipeline) {
        pipelineId = pipelineId || defaultPipeline.id;
        stageId = stageId || defaultPipeline.stages[0]?.id;
      }
    }

    const value = Number(dto.value || 0);
    const probability = dto.probability !== undefined ? dto.probability : 20;
    const weightedRevenue = (value * probability) / 100;

    const deal = await this.prisma.deal.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        ownerId: dto.ownerId || userId,
        customerId: dto.customerId,
        companyId: dto.companyId,
        contactId: dto.contactId,
        pipelineId,
        stageId,
        salesTeamId: dto.salesTeamId,
        title: dto.title,
        description: dto.description,
        stage: dto.stage || DealStage.NEW,
        value,
        recurringRevenue: dto.recurringRevenue || 0,
        probability,
        weightedRevenue,
        currency: dto.currency || 'INR',
        source: dto.source,
        campaign: dto.campaign,
        priority: dto.priority || 'MEDIUM',
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        notes: dto.notes,
        tags: dto.tags || [],
        customFields: dto.customFields || {},
      },
      include: {
        customer: true,
        pipelineStage: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Record initial history
    await this.prisma.opportunityHistory.create({
      data: {
        organizationId: orgId,
        opportunityId: deal.id,
        changedById: userId,
        toStage: deal.pipelineStage?.name || 'New',
        toValue: deal.value,
        toProb: deal.probability,
        reason: 'Created opportunity',
      },
    });

    await this.events.publish('opportunity.created', {
      orgId,
      userId,
      opportunityId: deal.id,
      title: deal.title,
      value: deal.value,
      customerId: deal.customerId,
    });

    return deal;
  }

  async update(orgId: string, id: string, dto: UpdateDealDto) {
    const existing = await this.prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Opportunity not found');

    const value = dto.value !== undefined ? Number(dto.value) : Number(existing.value);
    const probability = dto.probability !== undefined ? dto.probability : existing.probability;
    const weightedRevenue = (value * probability) / 100;

    return this.prisma.deal.update({
      where: { id },
      data: {
        ...dto,
        value,
        probability,
        weightedRevenue,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      include: {
        customer: true,
        company: true,
        contact: true,
        pipelineStage: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Real stage transition with validation, probability sync, history logging, and domain event emission.
   */
  async moveStage(orgId: string, userId: string, id: string, dto: MoveDealStageDto) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: { pipelineStage: true },
    });
    if (!deal) throw new NotFoundException('Opportunity not found');

    const targetStage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, organizationId: orgId },
    });
    if (!targetStage) throw new NotFoundException('Target pipeline stage not found');

    let dealStageEnum: DealStage = DealStage.NEW;
    if (targetStage.isWon) {
      dealStageEnum = DealStage.WON;
    } else if (targetStage.isLost) {
      dealStageEnum = DealStage.LOST;
    } else {
      const lowerName = targetStage.name.toLowerCase();
      if (lowerName.includes('qualif')) dealStageEnum = DealStage.QUALIFIED;
      else if (lowerName.includes('propos')) dealStageEnum = DealStage.PROPOSAL;
      else if (lowerName.includes('negot')) dealStageEnum = DealStage.NEGOTIATION;
      else dealStageEnum = DealStage.NEW;
    }

    const newProbability = dto.probability !== undefined ? dto.probability : targetStage.probability;
    const val = Number(deal.value || 0);
    const newWeightedRevenue = (val * newProbability) / 100;

    const now = new Date();
    const wonAt = targetStage.isWon ? now : undefined;
    const lostAt = targetStage.isLost ? now : undefined;
    const closedAt = (targetStage.isWon || targetStage.isLost) ? now : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedDeal = await tx.deal.update({
        where: { id },
        data: {
          stageId: targetStage.id,
          stage: dealStageEnum,
          probability: newProbability,
          weightedRevenue: newWeightedRevenue,
          wonAt,
          lostAt,
          closedAt,
          lostReason: targetStage.isLost ? dto.reason : undefined,
        },
        include: {
          pipelineStage: true,
          customer: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Record stage transition in OpportunityHistory
      await tx.opportunityHistory.create({
        data: {
          organizationId: orgId,
          opportunityId: id,
          changedById: userId,
          fromStage: deal.pipelineStage?.name || deal.stage,
          toStage: targetStage.name,
          fromValue: deal.value,
          toValue: updatedDeal.value,
          fromProb: deal.probability,
          toProb: newProbability,
          reason: dto.reason || `Moved stage to ${targetStage.name}`,
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          organizationId: orgId,
          type: 'STATUS_CHANGE',
          title: `Stage changed to ${targetStage.name}`,
          description: dto.reason ? `Reason: ${dto.reason}` : `Stage moved from ${deal.pipelineStage?.name || deal.stage} to ${targetStage.name}`,
          entityType: 'DEAL',
          entityId: id,
          dealId: id,
          customerId: deal.customerId,
          createdById: userId,
        },
      });

      return updatedDeal;
    });

    // Publish domain events
    if (targetStage.isWon) {
      await this.events.publish('opportunity.won', {
        orgId,
        userId,
        opportunityId: id,
        value: updated.value,
        customerId: updated.customerId,
      });
    } else if (targetStage.isLost) {
      await this.events.publish('opportunity.lost', {
        orgId,
        userId,
        opportunityId: id,
        reason: dto.reason,
      });
    } else {
      await this.events.publish('opportunity.stage_changed', {
        orgId,
        userId,
        opportunityId: id,
        fromStage: deal.pipelineStage?.name || deal.stage,
        toStage: targetStage.name,
        value: updated.value,
      });
    }

    return updated;
  }

  async markWon(orgId: string, userId: string, id: string, dto: CloseDealDto = {}) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!deal) throw new NotFoundException('Opportunity not found');

    const wonStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: deal.pipelineId || undefined, isWon: true, organizationId: orgId },
    });

    const finalVal = dto.finalRevenue !== undefined ? dto.finalRevenue : Number(deal.value);

    return this.moveStage(orgId, userId, id, {
      stageId: wonStage?.id || deal.stageId || '',
      probability: 100,
      reason: dto.reason || 'Closed Won',
    });
  }

  async markLost(orgId: string, userId: string, id: string, dto: CloseDealDto = {}) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!deal) throw new NotFoundException('Opportunity not found');

    const lostStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: deal.pipelineId || undefined, isLost: true, organizationId: orgId },
    });

    return this.moveStage(orgId, userId, id, {
      stageId: lostStage?.id || deal.stageId || '',
      probability: 0,
      reason: dto.reason || 'Closed Lost',
    });
  }

  async remove(orgId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!deal) throw new NotFoundException('Opportunity not found');

    await this.prisma.deal.delete({ where: { id } });
    return { message: 'Opportunity deleted successfully' };
  }
}
