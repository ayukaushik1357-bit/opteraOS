import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ── Employees ─────────────────────────────────────────────────────────────
  async getEmployees(orgId: string, query: any = {}) {
    const { department, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (department && department !== 'ALL') where.department = department;

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { leaves: true, attendance: true },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async findOneEmployee(orgId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: { leaves: true, attendance: true },
    });
    if (!employee) throw new NotFoundException('Employee record not found');
    return employee;
  }

  async createEmployee(orgId: string, dto: any) {
    return this.prisma.employee.create({
      data: {
        organizationId: orgId,
        firstName: dto.firstName,
        lastName: dto.lastName || '',
        email: dto.email,
        phone: dto.phone || null,
        department: dto.department || 'General',
        jobTitle: dto.jobTitle || 'Team Member',
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        salary: dto.salary ? Number(dto.salary) : null,
      },
    });
  }

  // ── Leave Management ──────────────────────────────────────────────────────
  async getLeaves(orgId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employee: { organizationId: orgId } },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeaveRequest(orgId: string, dto: any) {
    await this.findOneEmployee(orgId, dto.employeeId);
    return this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType || 'CASUAL',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        daysCount: Number(dto.daysCount) || 1,
        reason: dto.reason || null,
        status: LeaveStatus.PENDING,
      },
      include: { employee: true },
    });
  }

  async updateLeaveStatus(orgId: string, leaveId: string, status: LeaveStatus, approverId?: string) {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveId, employee: { organizationId: orgId } },
    });
    if (!leave) throw new NotFoundException('Leave request not found');

    return this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status, approvedById: approverId || null },
      include: { employee: true },
    });
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  async getAttendance(orgId: string) {
    return this.prisma.attendance.findMany({
      where: { employee: { organizationId: orgId } },
      include: { employee: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async recordAttendance(orgId: string, dto: any) {
    await this.findOneEmployee(orgId, dto.employeeId);
    const date = dto.date ? new Date(dto.date) : new Date();
    date.setHours(0, 0, 0, 0);

    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date } },
      update: {
        status: dto.status || 'PRESENT',
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      },
      create: {
        employeeId: dto.employeeId,
        date,
        status: dto.status || 'PRESENT',
        checkIn: dto.checkIn ? new Date(dto.checkIn) : new Date(),
      },
      include: { employee: true },
    });
  }
}
