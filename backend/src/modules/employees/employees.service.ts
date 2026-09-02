import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../../common/events/domain-events.service';
import { CreateEmployeeDto, UpdateEmployeeDto, QueryEmployeesDto } from './dto/employees.dto';
import { ActorType } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(orgId: string, query: QueryEmployeesDto = {}) {
    const { search, departmentId, teamId, employmentStatus, page = 1, pageSize = 30 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = { organizationId: orgId };
    if (departmentId) where.departmentId = departmentId;
    if (teamId) where.teamId = teamId;
    if (employmentStatus) where.employmentStatus = employmentStatus;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { workEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { firstName: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, avatarUrl: true } },
          _count: { select: { timeOffs: true, attendances: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async findById(orgId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: {
        department: true,
        team: true,
        user: true,
        teamMemberships: { include: { team: true } },
        timeOffs: { take: 10, orderBy: { createdAt: 'desc' } },
        attendances: { take: 15, orderBy: { date: 'desc' } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(
    orgId: string,
    userId: string | null,
    dto: CreateEmployeeDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const count = await this.prisma.employee.count({ where: { organizationId: orgId } });
    const employeeNumber = dto.employeeNumber || `EMP-${String(count + 1).padStart(4, '0')}`;

    // Check unique employee number
    const existing = await this.prisma.employee.findUnique({
      where: { organizationId_employeeNumber: { organizationId: orgId, employeeNumber } },
    });
    if (existing) {
      throw new ConflictException(`Employee number "${employeeNumber}" already exists`);
    }

    const displayName = dto.displayName || `${dto.firstName} ${dto.lastName}`.trim();

    const employee = await this.prisma.employee.create({
      data: {
        organizationId: orgId,
        userId: dto.userId || null,
        departmentId: dto.departmentId || null,
        teamId: dto.teamId || null,
        managerId: dto.managerId || null,
        employeeNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName,
        workEmail: dto.workEmail ? dto.workEmail.toLowerCase() : null,
        personalEmail: dto.personalEmail ? dto.personalEmail.toLowerCase() : null,
        phone: dto.phone || null,
        jobTitle: dto.jobTitle,
        employmentType: dto.employmentType || 'FULL_TIME',
        employmentStatus: dto.employmentStatus || 'ACTIVE',
        hireDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        location: dto.location || null,
        timezone: dto.timezone || 'Asia/Kolkata',
        skillsMetadata: dto.skillsMetadata || null,
        avatarUrl: dto.avatarUrl || null,
        salary: dto.salary || null,
        status: 'ACTIVE',
      },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'employee.created',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'employee',
      resourceId: employee.id,
      newState: employee,
      requestId,
      source: 'employees-service',
      data: employee,
    });

    return employee;
  }

  async update(
    orgId: string,
    id: string,
    userId: string | null,
    dto: UpdateEmployeeDto,
    requestId?: string,
    actorType: ActorType = ActorType.USER,
  ) {
    const existing = await this.findById(orgId, id);

    let displayName = dto.displayName;
    if (!displayName && (dto.firstName || dto.lastName)) {
      const first = dto.firstName || existing.firstName;
      const last = dto.lastName !== undefined ? dto.lastName : existing.lastName;
      displayName = `${first} ${last}`.trim();
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        ...(displayName ? { displayName } : {}),
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        exitDate: dto.exitDate ? new Date(dto.exitDate) : undefined,
        workEmail: dto.workEmail !== undefined ? (dto.workEmail ? dto.workEmail.toLowerCase() : null) : undefined,
        personalEmail: dto.personalEmail !== undefined ? (dto.personalEmail ? dto.personalEmail.toLowerCase() : null) : undefined,
      },
      include: {
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await this.domainEvents.emit({
      eventName: 'employee.updated',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'employee',
      resourceId: id,
      oldState: existing,
      newState: updated,
      requestId,
      source: 'employees-service',
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
    await this.prisma.employee.delete({ where: { id } });

    await this.domainEvents.emit({
      eventName: 'employee.deleted',
      organizationId: orgId,
      userId,
      actorType,
      resource: 'employee',
      resourceId: id,
      oldState: existing,
      requestId,
      source: 'employees-service',
    });

    return { success: true, message: 'Employee deleted' };
  }
}
