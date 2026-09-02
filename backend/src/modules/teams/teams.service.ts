import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from './dto/teams.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, departmentId?: string) {
    const where: any = { organizationId: orgId };
    if (departmentId) where.departmentId = departmentId;

    return this.prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, employeeNumber: true } },
          },
        },
        _count: { select: { members: true, employees: true } },
      },
    });
  }

  async findById(orgId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId: orgId },
      include: {
        department: true,
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true, employeeNumber: true } },
          },
        },
        employees: true,
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateTeamDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const team = await this.prisma.team.create({
      data: {
        organizationId: orgId,
        departmentId: dto.departmentId || null,
        managerId: dto.managerId || null,
        name: dto.name.trim(),
        description: dto.description || null,
        teamType: dto.teamType || 'General',
        status: dto.status || 'ACTIVE',
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'team.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'team',
      resourceId: team.id,
      newState: team,
      requestId,
      source: 'teams-service',
      data: team,
    });

    return team;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateTeamDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    const updated = await this.prisma.team.update({
      where: { id },
      data: dto,
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'team.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'team',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'teams-service',
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
    await this.prisma.team.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'team.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'team',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'teams-service',
    });

    return { success: true, message: 'Team deleted' };
  }

  async addMember(
    orgId: string,
    teamId: string,
    userId: string | null,
    dto: AddTeamMemberDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    await this.findById(orgId, teamId);

    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId || null,
        employeeId: dto.employeeId || null,
        role: dto.role || 'MEMBER',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
      },
    });

    // If employeeId is given, link employee to team as well
    if (dto.employeeId) {
      await this.prisma.employee.updateMany({
        where: { id: dto.employeeId, organizationId: orgId },
        data: { teamId },
      });
    }

    await this.domainEvents.emit({
      eventName: 'team.member_added',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'team_member',
      resourceId: member.id,
      newState: member,
      requestId,
      source: 'teams-service',
      data: member,
    });

    return member;
  }

  async removeMember(
    orgId: string,
    teamId: string,
    memberId: string,
    userId: string | null,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    await this.findById(orgId, teamId);

    const member = await this.prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Team member record not found');

    await this.prisma.teamMember.delete({ where: { id: memberId } });

    await this.domainEvents.emit({
      eventName: 'team.member_removed',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'team_member',
      resourceId: memberId,
      oldState: member,
      requestId,
      source: 'teams-service',
    });

    return { success: true, message: 'Team member removed' };
  }
}
