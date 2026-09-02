import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CommunicationsService } from '../communications/communications.service';
import { UserRole, MemberStatus, ActorType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateMemberStatusDto,
} from './dto/organizations.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(userId: string, dto: CreateOrganizationDto, requestId?: string) {
    let slug = this.slugify(dto.name);
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${uuidv4().slice(0, 6)}`;

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        legalName: dto.legalName || null,
        slug,
        industry: dto.industry || null,
        currency: dto.currency ?? 'INR',
        timezone: dto.timezone ?? 'Asia/Kolkata',
        country: dto.country ?? 'IN',
        businessType: dto.businessType || null,
        companySize: dto.companySize || null,
        email: dto.email ? dto.email.toLowerCase() : null,
        phone: dto.phone || null,
        website: dto.website || null,
        address: dto.address || null,
        city: dto.city || null,
        state: dto.state || null,
        postalCode: dto.postalCode || null,
        fiscalSettings: dto.fiscalSettings || null,
        taxConfig: dto.taxConfig || null,
        ownerId: userId,
        members: {
          create: { userId, role: UserRole.OWNER, status: MemberStatus.ACTIVE },
        },
        subscription: {
          create: { plan: 'FREE', status: 'TRIAL' },
        },
      },
      include: {
        subscription: { select: { plan: true, status: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'organization.created',
      organizationId: org.id,
      userId,
      actorType: ActorType.USER,
      resource: 'organization',
      resourceId: org.id,
      newState: org,
      requestId,
      source: 'organizations-service',
      data: org,
    });

    return org;
  }

  async findById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        _count: {
          select: {
            customers: true,
            leads: true,
            deals: true,
            members: true,
            contacts: true,
            companies: true,
            departments: true,
            teams: true,
            employees: true,
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto, requestId?: string) {
    await this.assertRole(orgId, userId, [UserRole.OWNER, UserRole.ADMIN]);
    const existing = await this.findById(orgId);

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });

    await this.domainEvents.emit({
      eventName: 'organization.updated',
      organizationId: orgId,
      userId,
      actorType: ActorType.USER,
      resource: 'organization',
      resourceId: orgId,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'organizations-service',
      data: updated,
    });

    return updated;
  }

  async getMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, lastLoginAt: true, phone: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(orgId: string, senderId: string, dto: InviteMemberDto, requestId?: string) {
    await this.assertRole(orgId, senderId, [UserRole.OWNER, UserRole.ADMIN]);
    const org = await this.findById(orgId);

    // Check if already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existingUser) {
      const membership = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: existingUser.id } },
      });
      if (membership) throw new ConflictException('User is already a member of this organization');
    }

    // Check pending invites
    const pending = await this.prisma.invitation.findFirst({
      where: { organizationId: orgId, email: dto.email.toLowerCase(), status: 'PENDING' },
    });
    if (pending) throw new ConflictException('An invitation is already pending for this email');

    const token = uuidv4();
    const invite = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: dto.email.toLowerCase(),
        role: dto.role ?? UserRole.EMPLOYEE,
        token,
        sentById: senderId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send invitation email through Communications service
    try {
      await this.communicationsService.sendEmail(
        orgId,
        senderId,
        {
          to: dto.email,
          subject: `You have been invited to join ${org.name} on opteraOS`,
          text: `You have been invited to join ${org.name} as a ${dto.role ?? 'EMPLOYEE'}. Please click the link to accept your invitation: /accept-invite?token=${token}`,
          html: `<p>You have been invited to join <strong>${org.name}</strong> on opteraOS.</p><p><a href="/accept-invite?token=${token}">Accept Invitation</a></p>`,
        },
        requestId,
      );
    } catch (err: any) {
      console.warn(`[Orgs] Could not send invite email: ${err.message}`);
    }

    await this.domainEvents.emit({
      eventName: 'organization.member_invited',
      organizationId: orgId,
      userId: senderId,
      actorType: ActorType.USER,
      resource: 'invitation',
      resourceId: invite.id,
      newState: invite,
      requestId,
      source: 'organizations-service',
    });

    return { message: `Invitation sent to ${dto.email}`, inviteId: invite.id, token };
  }

  async acceptInvite(token: string, userId: string, requestId?: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { token } });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
    });
    if (existing) throw new ConflictException('Already a member');

    const [member] = await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
          status: MemberStatus.ACTIVE,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);

    await this.domainEvents.emit({
      eventName: 'organization.member_joined',
      organizationId: invite.organizationId,
      userId,
      actorType: ActorType.USER,
      resource: 'organization_member',
      resourceId: member.id,
      newState: member,
      requestId,
      source: 'organizations-service',
    });

    return { message: 'Invitation accepted', orgId: invite.organizationId };
  }

  async updateMemberRole(orgId: string, requesterId: string, targetUserId: string, dto: UpdateMemberRoleDto, requestId?: string) {
    await this.assertRole(orgId, requesterId, [UserRole.OWNER, UserRole.ADMIN]);

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot change the owner role');

    const updated = await this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { role: dto.role },
    });

    await this.domainEvents.emit({
      eventName: 'organization.member_role_updated',
      organizationId: orgId,
      userId: requesterId,
      actorType: ActorType.USER,
      resource: 'organization_member',
      resourceId: updated.id,
      oldState: target,
      newState: updated,
      requestId,
      source: 'organizations-service',
    });

    return updated;
  }

  async updateMemberStatus(orgId: string, requesterId: string, targetUserId: string, dto: UpdateMemberStatusDto, requestId?: string) {
    await this.assertRole(orgId, requesterId, [UserRole.OWNER, UserRole.ADMIN]);

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot change the status of the owner');

    const updated = await this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { status: dto.status },
    });

    await this.domainEvents.emit({
      eventName: 'organization.member_status_updated',
      organizationId: orgId,
      userId: requesterId,
      actorType: ActorType.USER,
      resource: 'organization_member',
      resourceId: updated.id,
      oldState: target,
      newState: updated,
      requestId,
      source: 'organizations-service',
    });

    return updated;
  }

  async removeMember(orgId: string, requesterId: string, targetUserId: string, requestId?: string) {
    await this.assertRole(orgId, requesterId, [UserRole.OWNER, UserRole.ADMIN]);

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot remove the owner');

    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });

    await this.domainEvents.emit({
      eventName: 'organization.member_removed',
      organizationId: orgId,
      userId: requesterId,
      actorType: ActorType.USER,
      resource: 'organization_member',
      resourceId: target.id,
      oldState: target,
      requestId,
      source: 'organizations-service',
    });

    return { message: 'Member removed' };
  }

  private async assertRole(orgId: string, userId: string, allowedRoles: UserRole[]) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
