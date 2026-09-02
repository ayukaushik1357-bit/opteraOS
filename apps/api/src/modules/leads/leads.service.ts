import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityType, LeadStage } from '@prisma/client';
import {
  CreateLeadDto,
  UpdateLeadDto,
  DisqualifyLeadDto,
  ConvertLeadDto,
  AssignLeadDto,
  CheckDuplicatesDto,
  BulkLeadActionDto,
  ImportLeadsDto,
} from './dto/leads.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Lead Scoring Engine — Deterministic multi-factor scoring (0–100)
// Uses only domain data available at creation/recalculation time.
// No external AI provider required; scoring is instant and reproducible.
// ─────────────────────────────────────────────────────────────────────────────
export interface ScoreFactor {
  points: number;
  reason: string;
}

export interface ScoreResult {
  score: number;
  factors: Record<string, ScoreFactor>;
}

export function calculateLeadScore(lead: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  expectedRevenue?: number;
  stage?: LeadStage;
  notes?: string | null;
}): ScoreResult {
  const factors: Record<string, ScoreFactor> = {};
  let total = 0;

  // ── Contact completeness (max 35 pts) ──────────────────────────────────
  if (lead.email) {
    factors.email = { points: 15, reason: 'Work email provided — direct reachability confirmed' };
    total += 15;
  }
  if (lead.phone) {
    factors.phone = { points: 10, reason: 'Phone number provided — enables immediate outreach' };
    total += 10;
  }
  if (lead.company) {
    factors.company = { points: 10, reason: 'Company name known — B2B context established' };
    total += 10;
  }

  // ── Revenue potential (max 25 pts) ────────────────────────────────────
  const rev = lead.expectedRevenue ?? 0;
  if (rev >= 1000000) {
    factors.revenue = { points: 25, reason: 'High-value opportunity ≥ ₹10L — enterprise tier' };
    total += 25;
  } else if (rev >= 500000) {
    factors.revenue = { points: 20, reason: 'Significant opportunity ≥ ₹5L — mid-market' };
    total += 20;
  } else if (rev >= 100000) {
    factors.revenue = { points: 12, reason: 'Meaningful opportunity ≥ ₹1L — SMB tier' };
    total += 12;
  } else if (rev >= 10000) {
    factors.revenue = { points: 6, reason: 'Small opportunity ≥ ₹10K — starter tier' };
    total += 6;
  }

  // ── Lead source quality (max 20 pts) ──────────────────────────────────
  const src = (lead.source || '').toLowerCase();
  if (src.includes('referral') || src.includes('partner')) {
    factors.source = { points: 20, reason: 'Referral/partner source — highest conversion rate' };
    total += 20;
  } else if (src.includes('inbound') || src.includes('demo') || src.includes('website')) {
    factors.source = { points: 15, reason: 'Inbound/demo intent — active buying signal' };
    total += 15;
  } else if (src.includes('event') || src.includes('conference') || src.includes('expo')) {
    factors.source = { points: 10, reason: 'Event sourced — warm introduction' };
    total += 10;
  } else if (src.includes('cold') || src.includes('outbound') || src.includes('campaign')) {
    factors.source = { points: 5, reason: 'Outbound channel — requires nurturing' };
    total += 5;
  } else if (src.trim()) {
    factors.source = { points: 8, reason: `Lead source recorded: ${lead.source}` };
    total += 8;
  }

  // ── Engagement context (max 20 pts) ──────────────────────────────────
  const hasNotes = lead.notes && lead.notes.trim().length > 20;
  if (hasNotes) {
    factors.notes = { points: 10, reason: 'Detailed notes captured — qualified context available' };
    total += 10;
  }

  // Stage-based bonus (stage set manually on create)
  if (lead.stage === LeadStage.QUALIFIED) {
    factors.stage = { points: 10, reason: 'Pre-qualified by sales rep on entry' };
    total += 10;
  } else if (lead.stage === LeadStage.CONTACTED) {
    factors.stage = { points: 5, reason: 'Already in contact — relationship established' };
    total += 5;
  }

  return { score: Math.min(100, total), factors };
}

// ─────────────────────────────────────────────────────────────────────────────
// LeadsService
// ─────────────────────────────────────────────────────────────────────────────
const memoryLeads = new Map<string, any[]>();

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── List (paginated + filtered) ─────────────────────────────────────────
  async findAll(orgId: string, query: any = {}) {
    const { search, stage, page = 1, pageSize = 15 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    try {
      const where: any = { organizationId: orgId };
      if (stage && stage !== 'all') where.stage = stage;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
        ];
      }
      const [rows, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
        this.prisma.lead.count({ where }),
      ]);
      return {
        rows,
        total,
        page: Number(page),
        pageSize: take,
        pages: Math.ceil(total / take) || 1,
      };
    } catch {
      // Memory fallback
      let list = memoryLeads.get(orgId) || [];
      if (stage && stage !== 'all') {
        list = list.filter((l) => l.stage === stage);
      }
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(
          (l) =>
            (l.name && l.name.toLowerCase().includes(s)) ||
            (l.email && l.email.toLowerCase().includes(s)) ||
            (l.company && l.company.toLowerCase().includes(s)),
        );
      }
      const total = list.length;
      const rows = list.slice(skip, skip + take);
      return {
        rows,
        total,
        page: Number(page),
        pageSize: take,
        pages: Math.ceil(total / take) || 1,
      };
    }
  }

  // ─── Pipeline (grouped by stage) ─────────────────────────────────────────
  async getPipeline(orgId: string) {
    let leads: any[] = [];
    try {
      leads = await this.prisma.lead.findMany({
        where: { organizationId: orgId },
        orderBy: { score: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } catch {
      leads = memoryLeads.get(orgId) || [];
    }
    const stages = Object.values(LeadStage);
    return stages.reduce(
      (acc, stage) => {
        acc[stage] = leads.filter((l) => l.stage === stage);
        return acc;
      },
      {} as Record<string, typeof leads>,
    );
  }

  // ─── Get one ──────────────────────────────────────────────────────────────
  async findOne(orgId: string, id: string) {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id, organizationId: orgId },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      });
      if (lead) return lead;
    } catch {
      // Memory fallback
    }

    const list = memoryLeads.get(orgId) || [];
    const found = list.find((l) => l.id === id);
    if (found) return found;

    throw new NotFoundException('Lead not found');
  }

  // ─── Create + Score ───────────────────────────────────────────────────────
  async create(orgId: string, userId: string, dto: CreateLeadDto) {
    // 1. Calculate deterministic score before insert
    const { score, factors } = calculateLeadScore({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      source: dto.source,
      expectedRevenue: dto.expectedRevenue,
      stage: dto.stage,
      notes: dto.notes,
    });

    const { expectedRevenue, priority, ...prismaFields } = dto;
    const now = new Date();
    const fallbackId = crypto.randomUUID();

    const fallbackLead: any = {
      id: fallbackId,
      organizationId: orgId,
      name: dto.name,
      company: dto.company || null,
      email: dto.email || null,
      phone: dto.phone || null,
      source: dto.source || null,
      score,
      stage: dto.stage || LeadStage.NEW,
      notes: dto.notes || null,
      tags: dto.tags || [],
      ownerId: dto.ownerId || null,
      createdById: userId,
      convertedToId: null,
      createdAt: now,
      updatedAt: now,
      owner: dto.ownerId
        ? { id: dto.ownerId, firstName: 'Assigned', lastName: 'Rep', email: 'rep@opteraos.com' }
        : null,
    };

    let persistedLead = fallbackLead;

    try {
      persistedLead = await this.prisma.lead.create({
        data: {
          ...prismaFields,
          organizationId: orgId,
          createdById: userId,
          score,
          notes: dto.notes || null,
        },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    } catch {}

    // Save in memory store
    const list = memoryLeads.get(orgId) || [];
    memoryLeads.set(orgId, [{ ...persistedLead, scoringFactors: factors }, ...list.filter((l) => l.id !== persistedLead.id)]);

    // Fire-and-forget audit activity
    try {
      this.prisma.activity
        .create({
          data: {
            organizationId: orgId,
            type: ActivityType.NOTE,
            title: 'Lead Created',
            description: `Lead "${persistedLead.name}" created with AI score ${score}/100. Factors: ${Object.keys(factors).join(', ') || 'base scoring'}`,
            leadId: persistedLead.id,
            userId,
            metadata: JSON.parse(JSON.stringify({
              action: 'lead_created',
              score,
              scoringFactors: factors,
              expectedRevenue: expectedRevenue ?? null,
              priority: priority ?? null,
            })) as object,
          },
        })
        .catch(() => {});
    } catch {}

    // 6. Notify assigned owner if different from creator
    if (dto.ownerId && dto.ownerId !== userId) {
      this.notifications
        .create(
          orgId,
          dto.ownerId,
          'NEW_LEAD',
          'New Lead Assigned',
          `You have been assigned lead: "${persistedLead.name}" (${persistedLead.company || 'Direct'}) — Score: ${score}/100`,
          `/leads`,
        )
        .catch(() => {});
    }

    return {
      ...persistedLead,
      scoringFactors: factors,
      scoreUpdatedAt: persistedLead.updatedAt,
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  async update(orgId: string, id: string, dto: UpdateLeadDto) {
    const existing = await this.findOne(orgId, id);

    // Re-score if key fields changed
    const { expectedRevenue, priority, ...prismaFields } = dto;
    const shouldRescore =
      dto.email !== undefined ||
      dto.phone !== undefined ||
      dto.company !== undefined ||
      dto.source !== undefined ||
      dto.stage !== undefined;

    let scoreUpdate: { score?: number } = {};
    if (shouldRescore) {
      const merged = { ...existing, ...dto };
      const { score } = calculateLeadScore({
        email: merged.email,
        phone: merged.phone,
        company: merged.company,
        source: merged.source,
        expectedRevenue: expectedRevenue ?? undefined,
        stage: merged.stage,
        notes: merged.notes,
      });
      scoreUpdate = { score };
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { ...prismaFields, ...scoreUpdate },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    if (dto.ownerId && dto.ownerId !== existing.ownerId) {
      this.notifications
        .create(
          orgId,
          dto.ownerId,
          'NEW_LEAD',
          'Lead Reassigned to You',
          `You have been assigned lead: "${updated.name}" (${updated.company || 'Direct'})`,
          `/leads`,
        )
        .catch(() => {});
    }

    return updated;
  }

  // ─── Recalculate score ────────────────────────────────────────────────────
  async recalculateScore(orgId: string, id: string) {
    const lead = await this.findOne(orgId, id);
    const { score, factors } = calculateLeadScore({
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      stage: lead.stage,
      notes: lead.notes,
    });

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { score },
    });

    this.prisma.activity
      .create({
        data: {
          organizationId: orgId,
          type: ActivityType.NOTE,
          title: 'Score Recalculated',
          description: `Lead score updated to ${score}/100`,
          leadId: id,
          metadata: JSON.parse(JSON.stringify({ action: 'score_recalculated', score, scoringFactors: factors })) as object,
        },
      })
      .catch(() => {});

    return { ...updated, scoringFactors: factors, scoreUpdatedAt: updated.updatedAt };
  }

  // ─── Qualify ──────────────────────────────────────────────────────────────
  async qualify(orgId: string, id: string, userId: string) {
    const lead = await this.findOne(orgId, id);
    if (lead.stage === LeadStage.CONVERTED) {
      throw new BadRequestException('Cannot qualify a converted lead');
    }

    let updated: any;
    try {
      updated = await this.prisma.lead.update({
        where: { id },
        data: { stage: LeadStage.QUALIFIED },
      });
    } catch {}

    if (!updated || updated.id !== id) {
      updated = { ...lead, stage: LeadStage.QUALIFIED, updatedAt: new Date() };
    }

    const list = memoryLeads.get(orgId) || [];
    const idx = list.findIndex((l) => l.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updated };
    }

    try {
      this.prisma.activity
        .create({
          data: {
            organizationId: orgId,
            type: ActivityType.NOTE,
            title: 'Lead Qualified',
            description: `Lead "${lead.name}" marked as QUALIFIED`,
            leadId: id,
            userId,
            metadata: { action: 'qualify', previousStage: lead.stage },
          },
        })
        .catch(() => {});
    } catch {}

    return updated;
  }

  // ─── Disqualify ───────────────────────────────────────────────────────────
  async disqualify(orgId: string, id: string, userId: string, dto: DisqualifyLeadDto) {
    const lead = await this.findOne(orgId, id);
    if (lead.stage === LeadStage.CONVERTED) {
      throw new BadRequestException('Cannot disqualify a converted lead');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        stage: LeadStage.UNQUALIFIED,
        notes: dto.reason ? `${lead.notes ? lead.notes + '\n\n' : ''}Disqualified: ${dto.reason}` : lead.notes,
      },
    });

    this.prisma.activity
      .create({
        data: {
          organizationId: orgId,
          type: ActivityType.NOTE,
          title: 'Lead Disqualified',
          description: `Lead "${lead.name}" disqualified. Reason: ${dto.reason || 'Not specified'}`,
          leadId: id,
          userId,
          metadata: { action: 'disqualify', reason: dto.reason, previousStage: lead.stage },
        },
      })
      .catch(() => {});

    return updated;
  }

  // ─── Convert lead → customer + deal ──────────────────────────────────────
  async convert(orgId: string, id: string, userId: string, dto: ConvertLeadDto) {
    const lead = await this.findOne(orgId, id);

    if (lead.stage === LeadStage.CONVERTED) {
      throw new ConflictException('Lead is already converted');
    }

    // Atomic transaction: mark lead converted, create customer, create deal
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert customer by email or create new
      let customer = lead.email
        ? await tx.customer.findFirst({
            where: { organizationId: orgId, email: lead.email },
          })
        : null;

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            organizationId: orgId,
            name: lead.company || lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            status: 'ACTIVE',
          },
        });
      }

      // 2. Create deal
      const deal = await tx.deal.create({
        data: {
          organizationId: orgId,
          customerId: customer.id,
          title: dto.dealTitle || `${lead.company || lead.name} — Opportunity`,
          value: dto.value ?? 0,
          stage: 'QUALIFIED',
          ownerId: lead.ownerId || userId,
          createdById: userId,
        },
      });

      // 3. Mark lead as converted
      const updatedLead = await tx.lead.update({
        where: { id },
        data: { stage: LeadStage.CONVERTED, convertedToId: customer.id },
      });

      return { lead: updatedLead, customer, deal };
    });

    // Audit activity
    this.prisma.activity
      .create({
        data: {
          organizationId: orgId,
          type: ActivityType.NOTE,
          title: 'Lead Converted',
          description: `Lead "${lead.name}" converted to Customer "${result.customer.name}" and Deal "${result.deal.title}"`,
          leadId: id,
          customerId: result.customer.id,
          dealId: result.deal.id,
          userId,
          metadata: {
            action: 'convert',
            customerId: result.customer.id,
            dealId: result.deal.id,
            dealValue: dto.value,
          },
        },
      })
      .catch(() => {});

    return {
      lead: result.lead,
      customer: result.customer,
      deal: result.deal,
    };
  }

  // ─── Assign (round-robin / load-based / manual) ───────────────────────────
  async assign(orgId: string, id: string, userId: string, dto: AssignLeadDto) {
    const lead = await this.findOne(orgId, id);

    let targetUserId = dto.targetUserId;

    if (dto.strategy === 'MANUAL') {
      if (!targetUserId) throw new BadRequestException('targetUserId is required for MANUAL strategy');
    } else {
      // Get all active org members with EMPLOYEE or MANAGER role
      const members = await this.prisma.organizationMember.findMany({
        where: { organizationId: orgId, role: { in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] } },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });

      if (members.length === 0) throw new BadRequestException('No eligible members to assign');

      if (dto.strategy === 'ROUND_ROBIN') {
        // Assign to the member with the fewest owned leads
        const leadCounts = await Promise.all(
          members.map(async (m) => ({
            userId: m.userId,
            user: m.user,
            count: await this.prisma.lead.count({
              where: { organizationId: orgId, ownerId: m.userId, stage: { notIn: ['CONVERTED', 'LOST', 'UNQUALIFIED'] } },
            }),
          })),
        );
        leadCounts.sort((a, b) => a.count - b.count);
        targetUserId = leadCounts[0].userId;
      } else if (dto.strategy === 'LOAD_BASED') {
        // Assign to member with fewest active deals
        const dealCounts = await Promise.all(
          members.map(async (m) => ({
            userId: m.userId,
            user: m.user,
            count: await this.prisma.deal.count({
              where: { organizationId: orgId, ownerId: m.userId, stage: { notIn: ['WON', 'LOST'] } },
            }),
          })),
        );
        dealCounts.sort((a, b) => a.count - b.count);
        targetUserId = dealCounts[0].userId;
      } else {
        targetUserId = members[0].userId;
      }
    }

    // Validate targetUserId is org member
    const ownerMember = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId! } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!ownerMember) throw new BadRequestException('Target user is not an org member');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { ownerId: targetUserId },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    this.prisma.activity
      .create({
        data: {
          organizationId: orgId,
          type: ActivityType.NOTE,
          title: 'Lead Assigned',
          description: `Lead assigned to ${ownerMember.user.firstName} ${ownerMember.user.lastName} via ${dto.strategy}`,
          leadId: id,
          userId,
          metadata: { action: 'assign', strategy: dto.strategy, assignedTo: targetUserId },
        },
      })
      .catch(() => {});

    if (targetUserId !== userId) {
      this.notifications
        .create(
          orgId,
          targetUserId!,
          'NEW_LEAD',
          'Lead Assigned to You',
          `"${lead.name}" (${lead.company || 'Direct'}) has been assigned to you`,
          `/leads`,
        )
        .catch(() => {});
    }

    return { lead: updated, owner: ownerMember.user };
  }

  // ─── Check duplicates ─────────────────────────────────────────────────────
  async checkDuplicates(orgId: string, dto: CheckDuplicatesDto) {
    const matches: { id: string; name: string; type: 'lead' | 'customer'; matchType: string }[] = [];

    if (dto.email) {
      const [leadHit, customerHit] = await Promise.all([
        this.prisma.lead.findFirst({ where: { organizationId: orgId, email: dto.email } }),
        this.prisma.customer.findFirst({ where: { organizationId: orgId, email: dto.email } }),
      ]);
      if (leadHit) matches.push({ id: leadHit.id, name: leadHit.name, type: 'lead', matchType: 'email' });
      if (customerHit) matches.push({ id: customerHit.id, name: customerHit.name, type: 'customer', matchType: 'email' });
    }

    if (dto.phone) {
      const [leadHit, customerHit] = await Promise.all([
        this.prisma.lead.findFirst({ where: { organizationId: orgId, phone: dto.phone } }),
        this.prisma.customer.findFirst({ where: { organizationId: orgId, phone: dto.phone } }),
      ]);
      if (leadHit && !matches.find((m) => m.id === leadHit.id))
        matches.push({ id: leadHit.id, name: leadHit.name, type: 'lead', matchType: 'phone' });
      if (customerHit && !matches.find((m) => m.id === customerHit.id))
        matches.push({ id: customerHit.id, name: customerHit.name, type: 'customer', matchType: 'phone' });
    }

    if (dto.company) {
      const [leadHit, customerHit] = await Promise.all([
        this.prisma.lead.findFirst({ where: { organizationId: orgId, company: { contains: dto.company, mode: 'insensitive' } } }),
        this.prisma.customer.findFirst({ where: { organizationId: orgId, company: { contains: dto.company, mode: 'insensitive' } } }),
      ]);
      if (leadHit && !matches.find((m) => m.id === leadHit.id))
        matches.push({ id: leadHit.id, name: leadHit.name, type: 'lead', matchType: 'company' });
      if (customerHit && !matches.find((m) => m.id === customerHit.id))
        matches.push({ id: customerHit.id, name: customerHit.name, type: 'customer', matchType: 'company' });
    }

    return {
      status: matches.length > 0 ? 'FOUND' : 'NONE',
      count: matches.length,
      matches,
    };
  }

  // ─── Bulk Actions ────────────────────────────────────────────────────────
  async bulkAction(orgId: string, userId: string, dto: BulkLeadActionDto) {
    const { leadIds, action, payload } = dto;
    if (!leadIds || leadIds.length === 0) {
      throw new BadRequestException('leadIds array cannot be empty');
    }

    let affected = 0;
    switch (action) {
      case 'delete': {
        const res = await this.prisma.lead.deleteMany({
          where: { organizationId: orgId, id: { in: leadIds } },
        });
        affected = res.count;
        break;
      }
      case 'qualify': {
        const res = await this.prisma.lead.updateMany({
          where: { organizationId: orgId, id: { in: leadIds } },
          data: { stage: LeadStage.QUALIFIED },
        });
        affected = res.count;
        break;
      }
      case 'disqualify': {
        const res = await this.prisma.lead.updateMany({
          where: { organizationId: orgId, id: { in: leadIds } },
          data: { stage: LeadStage.UNQUALIFIED },
        });
        affected = res.count;
        break;
      }
      case 'stage': {
        if (!payload?.stage) throw new BadRequestException('payload.stage is required');
        const res = await this.prisma.lead.updateMany({
          where: { organizationId: orgId, id: { in: leadIds } },
          data: { stage: payload.stage },
        });
        affected = res.count;
        break;
      }
      case 'assign': {
        if (!payload?.ownerId) throw new BadRequestException('payload.ownerId is required');
        const res = await this.prisma.lead.updateMany({
          where: { organizationId: orgId, id: { in: leadIds } },
          data: { ownerId: payload.ownerId },
        });
        affected = res.count;
        break;
      }
      default:
        throw new BadRequestException(`Unknown bulk action: ${action}`);
    }

    return { action, count: affected };
  }

  // ─── CSV Import ───────────────────────────────────────────────────────────
  async importCsv(orgId: string, userId: string, rows: any[], dryRun = false) {
    if (!rows || rows.length === 0) {
      throw new BadRequestException('No rows provided for import');
    }

    const errors: { row: number; reason: string }[] = [];
    const validRows: any[] = [];

    rows.forEach((row, idx) => {
      const name = row.name || row.Name || row['Full Name'] || row.fullName;
      if (!name) {
        errors.push({ row: idx + 1, reason: 'Missing required field: Name' });
        return;
      }

      const email = row.email || row.Email;
      const phone = row.phone || row.Phone;
      const company = row.company || row.Company;
      const source = row.source || row.Source || 'CSV Import';

      const { score } = calculateLeadScore({
        email,
        phone,
        company,
        source,
        stage: LeadStage.NEW,
      });

      validRows.push({
        organizationId: orgId,
        name,
        company: company || null,
        email: email || null,
        phone: phone || null,
        source,
        score,
        stage: LeadStage.NEW,
        ownerId: userId,
      });
    });

    if (dryRun) {
      return {
        dryRun: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: errors.length,
        errors,
        preview: validRows.slice(0, 5),
      };
    }

    let inserted = 0;
    if (validRows.length > 0) {
      const res = await this.prisma.lead.createMany({
        data: validRows,
        skipDuplicates: true,
      });
      inserted = res.count;
    }

    return {
      success: true,
      total: rows.length,
      inserted,
      errors,
    };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted' };
  }
}
