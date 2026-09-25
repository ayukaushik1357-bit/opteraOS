import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/organizations.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    let slug = this.slugify(dto.name);
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${uuidv4().slice(0, 6)}`;

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        industry: dto.industry,
        currency: dto.currency ?? 'INR',
        businessType: dto.businessType,
        ownerId: userId,
        members: {
          create: { userId, role: UserRole.OWNER },
        },
      },
    });

    return org;
  }

  async findById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { customers: true, leads: true, deals: true, members: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(orgId: string, userId: string, dto: UpdateOrganizationDto) {
    await this.assertRole(orgId, userId, [UserRole.OWNER, UserRole.ADMIN]);
    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });
  }

  async getMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, lastLoginAt: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(orgId: string, senderId: string, dto: InviteMemberDto) {
    await this.assertRole(orgId, senderId, [UserRole.OWNER, UserRole.ADMIN]);

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

    // TODO: send invite email
    console.log(`[Orgs] Invite sent to ${dto.email}: token=${token}`);

    return { message: `Invitation sent to ${dto.email}`, inviteId: invite.id };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { token } });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
    });
    if (existing) throw new ConflictException('Already a member');

    await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: { organizationId: invite.organizationId, userId, role: invite.role },
      }),
      this.prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);

    return { message: 'Invitation accepted', orgId: invite.organizationId };
  }

  async updateMemberRole(orgId: string, requesterId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    await this.assertRole(orgId, requesterId, [UserRole.OWNER, UserRole.ADMIN]);

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot change the owner role');

    return this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { role: dto.role },
    });
  }

  async removeMember(orgId: string, requesterId: string, targetUserId: string) {
    await this.assertRole(orgId, requesterId, [UserRole.OWNER, UserRole.ADMIN]);

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot remove the owner');

    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
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
