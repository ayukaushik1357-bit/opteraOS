import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimeOffStatus, JobApplicationStatus } from '@prisma/client';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ─── Employees ────────────────────────────────────────────────────────────
  async getEmployees(orgId: string, query: { departmentId?: string; search?: string; page?: number; pageSize?: number } = {}) {
    const { departmentId, search, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { firstName: 'asc' },
        include: {
          department: true,
          user: { select: { id: true, email: true, avatarUrl: true } },
          _count: { select: { timeOffs: true, attendances: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getEmployee(orgId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: {
        department: true,
        user: true,
        timeOffs: { take: 10, orderBy: { createdAt: 'desc' } },
        attendances: { take: 15, orderBy: { date: 'desc' } },
        appraisals: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async createEmployee(orgId: string, dto: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    departmentId?: string;
    employeeNumber?: string;
    employmentType?: any;
    salary?: number;
    userId?: string;
  }) {
    const count = await this.prisma.employee.count({ where: { organizationId: orgId } });
    const employeeNumber = dto.employeeNumber || `EMP-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.employee.create({
      data: {
        organizationId: orgId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        departmentId: dto.departmentId,
        employeeNumber,
        employmentType: dto.employmentType || 'FULL_TIME',
        salary: dto.salary,
        userId: dto.userId,
      },
      include: { department: true },
    });
  }

  async updateEmployee(orgId: string, id: string, dto: any) {
    await this.getEmployee(orgId, id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  // ─── Time Off & Leaves ────────────────────────────────────────────────────
  async getTimeOffRequests(orgId: string, query: { status?: TimeOffStatus; employeeId?: string } = {}) {
    const where: any = { organizationId: orgId };
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;

    return this.prisma.timeOffRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: true },
    });
  }

  async createTimeOffRequest(orgId: string, dto: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason?: string;
  }) {
    return this.prisma.timeOffRequest.create({
      data: {
        organizationId: orgId,
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        daysCount: dto.daysCount,
        reason: dto.reason,
        status: TimeOffStatus.PENDING,
      },
      include: { employee: true },
    });
  }

  async approveTimeOff(orgId: string, id: string, approverId?: string) {
    return this.prisma.timeOffRequest.update({
      where: { id },
      data: { status: TimeOffStatus.APPROVED, approvedById: approverId },
      include: { employee: true },
    });
  }

  // ─── Attendance ───────────────────────────────────────────────────────────
  async getAttendance(orgId: string, query: { date?: string; employeeId?: string } = {}) {
    const where: any = { organizationId: orgId };
    if (query.employeeId) where.employeeId = query.employeeId;

    return this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
      include: { employee: true },
    });
  }

  async logAttendance(orgId: string, dto: {
    employeeId: string;
    date?: string;
    checkIn: string;
    checkOut?: string;
    durationHours?: number;
    status?: string;
  }) {
    return this.prisma.attendanceRecord.create({
      data: {
        organizationId: orgId,
        employeeId: dto.employeeId,
        date: dto.date ? new Date(dto.date) : new Date(),
        checkIn: new Date(dto.checkIn),
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        durationHours: dto.durationHours,
        status: dto.status || 'PRESENT',
      },
      include: { employee: true },
    });
  }

  // ─── Recruitment ATS ──────────────────────────────────────────────────────
  async getJobs(orgId: string) {
    return this.prisma.recruitmentJob.findMany({
      where: { organizationId: orgId },
      include: { department: true, _count: { select: { applicants: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJob(orgId: string, dto: any) {
    return this.prisma.recruitmentJob.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async getApplicants(orgId: string, jobId?: string) {
    const where: any = { organizationId: orgId };
    if (jobId) where.jobId = jobId;
    return this.prisma.jobApplicant.findMany({
      where,
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApplicant(orgId: string, dto: any) {
    return this.prisma.jobApplicant.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateApplicantStage(orgId: string, id: string, stage: string, status?: JobApplicationStatus) {
    const data: any = { stage };
    if (status) data.status = status;
    return this.prisma.jobApplicant.update({ where: { id }, data });
  }
}
