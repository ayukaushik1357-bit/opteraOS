import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateLeadDto, UpdateLeadDto, ConvertLeadDto, AssignLeadDto, CheckDuplicateDto, BulkLeadActionDto, LeadAssignmentStrategy } from './dto/leads.dto';
import { LeadStage } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private events: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, stage, ownerId, source, priority, isArchived, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (isArchived === 'true') {
      where.isArchived = true;
    } else {
      where.isArchived = false;
    }

    if (stage && stage !== 'all') where.stage = stage;
    if (ownerId) where.ownerId = ownerId;
    if (source) where.source = source;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          companyRel: { select: { id: true, displayName: true, legalName: true } },
          contact: { select: { id: true, name: true, email: true, phone: true } },
          salesTeam: { select: { id: true, name: true } },
          leadSource: { select: { id: true, name: true } },
          _count: { select: { activities: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async getPipeline(orgId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { organizationId: orgId, isArchived: false },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        companyRel: { select: { id: true, displayName: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stages: LeadStage[] = [
      LeadStage.NEW,
      LeadStage.CONTACTED,
      LeadStage.QUALIFIED,
      LeadStage.UNQUALIFIED,
      LeadStage.CONVERTED,
      LeadStage.LOST,
    ];

    return stages.reduce((acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    }, {} as Record<string, typeof leads>);
  }

  async findOne(orgId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: orgId },
      include: {
        owner: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        companyRel: true,
        contact: true,
        salesTeam: true,
        leadSource: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const duplicates = await this.checkDuplicates(orgId, {
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      company: lead.company || undefined,
    }, lead.id);

    return {
      ...lead,
      duplicateAnalysis: duplicates,
    };
  }

  /**
   * Multi-criteria duplicate detector across Leads, Contacts, and Companies.
   */
  async checkDuplicates(orgId: string, dto: CheckDuplicateDto, excludeLeadId?: string) {
    const matches: Array<{
      type: 'LEAD' | 'CONTACT' | 'COMPANY';
      id: string;
      name: string;
      matchType: 'EXACT_EMAIL' | 'EXACT_PHONE' | 'COMPANY_NAME' | 'DOMAIN';
      confidence: 'EXACT' | 'PROBABLE';
    }> = [];

    const { email, phone, company } = dto;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = phone?.replace(/\D/g, '');
    const cleanCompany = company?.trim().toLowerCase();

    if (cleanEmail) {
      const [dupLeads, dupContacts] = await Promise.all([
        this.prisma.lead.findMany({
          where: {
            organizationId: orgId,
            email: { equals: cleanEmail, mode: 'insensitive' },
            ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
          },
          select: { id: true, name: true, email: true },
        }),
        this.prisma.contact.findMany({
          where: {
            organizationId: orgId,
            email: { equals: cleanEmail, mode: 'insensitive' },
          },
          select: { id: true, name: true, email: true },
        }),
      ]);

      dupLeads.forEach((l) => matches.push({ type: 'LEAD', id: l.id, name: l.name, matchType: 'EXACT_EMAIL', confidence: 'EXACT' }));
      dupContacts.forEach((c) => matches.push({ type: 'CONTACT', id: c.id, name: c.name, matchType: 'EXACT_EMAIL', confidence: 'EXACT' }));
    }

    if (cleanPhone && cleanPhone.length >= 7) {
      const [dupLeads, dupContacts] = await Promise.all([
        this.prisma.lead.findMany({
          where: {
            organizationId: orgId,
            phone: { contains: cleanPhone },
            ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
          },
          select: { id: true, name: true, phone: true },
        }),
        this.prisma.contact.findMany({
          where: {
            organizationId: orgId,
            phone: { contains: cleanPhone },
          },
          select: { id: true, name: true, phone: true },
        }),
      ]);

      dupLeads.forEach((l) => matches.push({ type: 'LEAD', id: l.id, name: l.name, matchType: 'EXACT_PHONE', confidence: 'EXACT' }));
      dupContacts.forEach((c) => matches.push({ type: 'CONTACT', id: c.id, name: c.name, matchType: 'EXACT_PHONE', confidence: 'EXACT' }));
    }

    if (cleanCompany && cleanCompany.length >= 3) {
      const [dupCompanies, dupLeads] = await Promise.all([
        this.prisma.company.findMany({
          where: {
            organizationId: orgId,
            displayName: { contains: cleanCompany, mode: 'insensitive' },
          },
          select: { id: true, displayName: true },
        }),
        this.prisma.lead.findMany({
          where: {
            organizationId: orgId,
            company: { contains: cleanCompany, mode: 'insensitive' },
            ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
          },
          select: { id: true, name: true, company: true },
        }),
      ]);

      dupCompanies.forEach((co) => matches.push({ type: 'COMPANY', id: co.id, name: co.displayName, matchType: 'COMPANY_NAME', confidence: 'PROBABLE' }));
      dupLeads.forEach((l) => matches.push({ type: 'LEAD', id: l.id, name: `${l.name} (${l.company})`, matchType: 'COMPANY_NAME', confidence: 'PROBABLE' }));
    }

    const status = matches.some((m) => m.confidence === 'EXACT')
      ? 'EXACT'
      : matches.length > 0
        ? 'PROBABLE'
        : 'NONE';

    return {
      status,
      count: matches.length,
      matches,
    };
  }

  /**
   * Multi-Factor AI/Rule Lead Scoring Engine.
   */
  calculateScore(data: {
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    source?: string | null;
    expectedRevenue?: number | null;
    activityCount?: number;
  }) {
    let score = 0;
    const factors: Record<string, { points: number; reason: string }> = {};

    if (data.email) {
      score += 15;
      factors['email_present'] = { points: 15, reason: 'Valid email address provided' };

      const freeEmailProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
      const domain = data.email.split('@')[1]?.toLowerCase();
      if (domain && !freeEmailProviders.includes(domain)) {
        score += 15;
        factors['business_domain'] = { points: 15, reason: `Corporate email domain: ${domain}` };
      }
    }

    if (data.phone && data.phone.length >= 8) {
      score += 15;
      factors['phone_present'] = { points: 15, reason: 'Direct contact phone number provided' };
    }

    if (data.company && data.company.trim().length > 2) {
      score += 15;
      factors['company_identified'] = { points: 15, reason: `Company identified: ${data.company}` };
    }

    const src = (data.source || '').toLowerCase();
    if (src.includes('referral') || src.includes('inbound') || src.includes('organic')) {
      score += 20;
      factors['high_intent_source'] = { points: 20, reason: `High-intent inbound source: ${data.source}` };
    } else if (src.includes('website') || src.includes('demo') || src.includes('pricing')) {
      score += 15;
      factors['direct_website_source'] = { points: 15, reason: 'Inbound demo/website request' };
    }

    if (data.expectedRevenue) {
      const rev = Number(data.expectedRevenue);
      if (rev >= 500000) {
        score += 20;
        factors['enterprise_deal_size'] = { points: 20, reason: `High deal value potential: > ${rev}` };
      } else if (rev >= 100000) {
        score += 10;
        factors['midmarket_deal_size'] = { points: 10, reason: `Mid-market deal value: ${rev}` };
      }
    }

    if (data.activityCount && data.activityCount > 0) {
      const activityPoints = Math.min(data.activityCount * 5, 20);
      score += activityPoints;
      factors['engagement_history'] = { points: activityPoints, reason: `${data.activityCount} recorded engagement activities` };
    }

    score = Math.min(Math.max(score, 0), 100);

    return {
      score,
      factors,
    };
  }

  async create(orgId: string, userId: string, dto: CreateLeadDto) {
    const { score, factors } = this.calculateScore({
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      source: dto.source,
      expectedRevenue: dto.expectedRevenue,
      activityCount: 0,
    });

    const duplicateCheck = await this.checkDuplicates(orgId, {
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
    });

    const lead = await this.prisma.lead.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: dto.name,
        title: dto.title,
        company: dto.company,
        companyId: dto.companyId,
        contactId: dto.contactId,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        source: dto.source || 'Direct',
        sourceId: dto.sourceId,
        medium: dto.medium,
        campaign: dto.campaign,
        stage: dto.stage || LeadStage.NEW,
        status: 'NEW',
        priority: dto.priority || 'MEDIUM',
        expectedRevenue: dto.expectedRevenue,
        probability: dto.probability || 10,
        notes: dto.notes,
        tags: dto.tags || [],
        ownerId: dto.ownerId || userId,
        salesTeamId: dto.salesTeamId,
        score,
        scoringFactors: factors as any,
        duplicateScore: duplicateCheck as any,
        customFields: dto.customFields || {},
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.events.publish('lead.created', {
      orgId,
      userId,
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      score,
      source: lead.source,
    });

    return lead;
  }

  async update(orgId: string, id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Lead not found');

    const activityCount = await this.prisma.activity.count({ where: { leadId: id } });

    const { score, factors } = this.calculateScore({
      email: dto.email !== undefined ? dto.email : existing.email,
      phone: dto.phone !== undefined ? dto.phone : existing.phone,
      company: dto.company !== undefined ? dto.company : existing.company,
      source: dto.source !== undefined ? dto.source : existing.source,
      expectedRevenue: dto.expectedRevenue !== undefined ? dto.expectedRevenue : Number(existing.expectedRevenue || 0),
      activityCount,
    });

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        score,
        scoringFactors: factors as any,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        companyRel: true,
        contact: true,
      },
    });
  }

  async recalculateScore(orgId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { activities: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const { score, factors } = this.calculateScore({
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      expectedRevenue: Number(lead.expectedRevenue || 0),
      activityCount: lead._count.activities,
    });

    return this.prisma.lead.update({
      where: { id },
      data: { score, scoringFactors: factors as any },
    });
  }

  async qualify(orgId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { stage: LeadStage.QUALIFIED, status: 'QUALIFIED' },
    });

    await this.events.publish('lead.qualified', { orgId, leadId: id, name: lead.name });
    return updated;
  }

  async disqualify(orgId: string, id: string, reason?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { stage: LeadStage.UNQUALIFIED, status: 'UNQUALIFIED', lostReason: reason },
    });

    await this.events.publish('lead.disqualified', { orgId, leadId: id, reason });
    return updated;
  }

  /**
   * Real business operation: Converts a Lead into Customer, Company, Contact, and Opportunity in a single atomic transaction.
   */
  async convert(orgId: string, userId: string, id: string, dto: ConvertLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId: orgId },
      include: { owner: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.stage === LeadStage.CONVERTED) {
      throw new ConflictException('Lead has already been converted.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create or link Company
      let companyId = dto.existingCompanyId || lead.companyId;
      if (!companyId && lead.company) {
        const company = await tx.company.create({
          data: {
            organizationId: orgId,
            displayName: lead.company,
            legalName: lead.company,
            website: lead.website,
            email: lead.email,
            phone: lead.phone,
            relationshipType: 'CUSTOMER',
            status: 'ACTIVE',
          },
        });
        companyId = company.id;
      }

      // 2. Create or link Contact
      let contactId = dto.existingContactId || lead.contactId;
      if (!contactId) {
        const nameParts = lead.name.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || undefined;

        const contact = await tx.contact.create({
          data: {
            organizationId: orgId,
            companyId,
            firstName,
            lastName,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            jobTitle: lead.title,
            website: lead.website,
            status: 'ACTIVE',
            createdById: userId,
          },
        });
        contactId = contact.id;
      }

      // 3. Create or link Customer account
      let customerId = dto.existingCustomerId;
      if (!customerId) {
        const customer = await tx.customer.create({
          data: {
            organizationId: orgId,
            companyId,
            contactId,
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            assignedTo: lead.ownerId || userId,
            status: 'ACTIVE',
          },
        });
        customerId = customer.id;
      }

      // 4. Create Opportunity / Deal (if requested or default true)
      let deal: any = null;
      if (dto.createDeal !== false) {
        // Resolve default pipeline and first stage
        let pipelineId = dto.pipelineId;
        let stageId = dto.stageId;

        if (!pipelineId || !stageId) {
          const defaultPipeline = await tx.pipeline.findFirst({
            where: { organizationId: orgId, isActive: true },
            include: { stages: { orderBy: { orderIndex: 'asc' }, take: 1 } },
          });

          if (defaultPipeline && defaultPipeline.stages[0]) {
            pipelineId = pipelineId || defaultPipeline.id;
            stageId = stageId || defaultPipeline.stages[0].id;
          }
        }

        const dealValue = dto.value !== undefined ? dto.value : Number(lead.expectedRevenue || 0);
        const dealProb = lead.probability || 20;

        deal = await tx.deal.create({
          data: {
            organizationId: orgId,
            customerId,
            companyId,
            contactId,
            pipelineId,
            stageId,
            salesTeamId: lead.salesTeamId,
            ownerId: lead.ownerId || userId,
            createdById: userId,
            title: dto.dealTitle || `${lead.company || lead.name} — New Deal`,
            value: dealValue,
            probability: dealProb,
            weightedRevenue: (dealValue * dealProb) / 100,
            currency: 'INR',
            source: lead.source,
            campaign: lead.campaign,
            expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
          },
        });

        // Record initial opportunity history
        await tx.opportunityHistory.create({
          data: {
            organizationId: orgId,
            opportunityId: deal.id,
            changedById: userId,
            toStage: 'New',
            toValue: dealValue,
            toProb: dealProb,
            reason: 'Converted from Lead',
          },
        });
      }

      // 5. Update Lead record as CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          stage: LeadStage.CONVERTED,
          status: 'CONVERTED',
          convertedAt: new Date(),
          convertedToId: deal?.id || customerId,
          companyId,
          contactId,
        },
      });

      // 6. Record universal conversion Activity
      await tx.activity.create({
        data: {
          organizationId: orgId,
          type: 'NOTE',
          title: 'Lead Converted',
          description: `Lead '${lead.name}' successfully converted into customer account and sales opportunity.`,
          entityType: 'LEAD',
          entityId: id,
          leadId: id,
          customerId,
          dealId: deal?.id,
          createdById: userId,
        },
      });

      await this.events.publish('lead.converted', {
        orgId,
        userId,
        leadId: id,
        customerId,
        companyId,
        contactId,
        dealId: deal?.id,
      });

      return {
        lead: updatedLead,
        customer: { id: customerId },
        company: companyId ? { id: companyId } : null,
        contact: contactId ? { id: contactId } : null,
        deal: deal ? { id: deal.id, title: deal.title } : null,
      };
    });
  }

  /**
   * Enterprise Lead Assignment Engine (Manual, Round-Robin, Load-Based, Rule-Based)
   */
  async assignLead(orgId: string, id: string, dto: AssignLeadDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!lead) throw new NotFoundException('Lead not found');

    let assignedOwnerId: string | null = null;

    if (dto.strategy === LeadAssignmentStrategy.MANUAL) {
      if (!dto.targetUserId) throw new BadRequestException('Target user ID required for manual assignment.');
      assignedOwnerId = dto.targetUserId;
    } else if (dto.strategy === LeadAssignmentStrategy.ROUND_ROBIN) {
      // Find team members
      const members = await this.prisma.teamMember.findMany({
        where: {
          team: { organizationId: orgId, ...(dto.salesTeamId ? { id: dto.salesTeamId } : {}) },
          userId: { not: null },
        },
        select: { userId: true },
      });

      if (members.length === 0) {
        // Fallback to active organization members
        const orgMembers = await this.prisma.organizationMember.findMany({
          where: { organizationId: orgId, status: 'ACTIVE' },
          select: { userId: true },
        });
        if (orgMembers.length > 0) {
          const randIdx = Math.floor(Math.random() * orgMembers.length);
          assignedOwnerId = orgMembers[randIdx].userId;
        }
      } else {
        const randIdx = Math.floor(Math.random() * members.length);
        assignedOwnerId = members[randIdx].userId;
      }
    } else if (dto.strategy === LeadAssignmentStrategy.LOAD_BASED) {
      // Find user with lowest open lead count
      const activeUsers = await this.prisma.organizationMember.findMany({
        where: { organizationId: orgId, status: 'ACTIVE' },
        select: { userId: true },
      });

      let leastLoadedUserId: string | null = null;
      let minLoad = Infinity;

      for (const u of activeUsers) {
        const count = await this.prisma.lead.count({
          where: {
            organizationId: orgId,
            ownerId: u.userId,
            stage: { notIn: [LeadStage.CONVERTED, LeadStage.LOST, LeadStage.UNQUALIFIED] },
          },
        });
        if (count < minLoad) {
          minLoad = count;
          leastLoadedUserId = u.userId;
        }
      }
      assignedOwnerId = leastLoadedUserId;
    }

    if (!assignedOwnerId) {
      throw new BadRequestException('No eligible salesperson found for assignment.');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ownerId: assignedOwnerId,
        salesTeamId: dto.salesTeamId || lead.salesTeamId,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.events.publish('lead.assigned', {
      orgId,
      leadId: id,
      ownerId: assignedOwnerId,
      strategy: dto.strategy,
    });

    return updated;
  }

  async bulkAction(orgId: string, userId: string, dto: BulkLeadActionDto) {
    const { leadIds, action, payload } = dto;
    if (!leadIds || leadIds.length === 0) {
      throw new BadRequestException('No lead IDs provided.');
    }

    if (action === 'ARCHIVE') {
      await this.prisma.lead.updateMany({
        where: { organizationId: orgId, id: { in: leadIds } },
        data: { isArchived: true },
      });
      return { success: true, count: leadIds.length, message: 'Leads archived' };
    }

    if (action === 'CHANGE_STAGE') {
      if (!payload?.stage) throw new BadRequestException('Target stage is required.');
      await this.prisma.lead.updateMany({
        where: { organizationId: orgId, id: { in: leadIds } },
        data: { stage: payload.stage },
      });
      return { success: true, count: leadIds.length, message: 'Lead stages updated' };
    }

    if (action === 'ASSIGN') {
      if (!payload?.ownerId) throw new BadRequestException('Target owner ID is required.');
      await this.prisma.lead.updateMany({
        where: { organizationId: orgId, id: { in: leadIds } },
        data: { ownerId: payload.ownerId },
      });
      return { success: true, count: leadIds.length, message: 'Leads reassigned' };
    }

    if (action === 'DELETE') {
      await this.prisma.lead.deleteMany({
        where: { organizationId: orgId, id: { in: leadIds } },
      });
      return { success: true, count: leadIds.length, message: 'Leads deleted' };
    }

    throw new BadRequestException(`Unsupported action: ${action}`);
  }

  async importCsv(orgId: string, userId: string, rows: Array<Record<string, any>>, dryRun = false) {
    const results = {
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string }>,
      preview: [] as any[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['Name'] || row['name'] || row['Full Name'];
      const email = row['Email'] || row['email'];
      const phone = row['Phone'] || row['phone'];
      const company = row['Company'] || row['company'];
      const source = row['Source'] || row['source'] || 'CSV Import';

      if (!name && !email && !company) {
        results.skipped++;
        results.errors.push({ row: i + 1, error: 'Missing minimum identifying data (name, email, or company)' });
        continue;
      }

      if (dryRun) {
        results.preview.push({ row: i + 1, name: name || 'Lead', email, phone, company, source });
        results.imported++;
      } else {
        try {
          await this.create(orgId, userId, {
            name: name || company || email || 'Imported Lead',
            email,
            phone,
            company,
            source,
          });
          results.imported++;
        } catch (err: any) {
          results.skipped++;
          results.errors.push({ row: i + 1, error: err.message || 'Failed to insert row' });
        }
      }
    }

    return results;
  }

  async remove(orgId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!lead) throw new NotFoundException('Lead not found');

    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted successfully' };
  }
}
