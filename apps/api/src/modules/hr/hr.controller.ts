import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { LeaveStatus } from '@prisma/client';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @Get('employees')
  getEmployees(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.getEmployees(orgId, q);
  }

  @Get('employees/:id')
  findOneEmployee(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOneEmployee(orgId, id);
  }

  @Post('employees')
  createEmployee(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createEmployee(orgId, dto);
  }

  @Get('leaves')
  getLeaves(@Param('orgId') orgId: string) {
    return this.service.getLeaves(orgId);
  }

  @Post('leaves')
  createLeaveRequest(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createLeaveRequest(orgId, dto);
  }

  @Patch('leaves/:id/status')
  updateLeaveStatus(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body('status') status: LeaveStatus,
  ) {
    return this.service.updateLeaveStatus(orgId, id, status);
  }

  @Get('attendance')
  getAttendance(@Param('orgId') orgId: string) {
    return this.service.getAttendance(orgId);
  }

  @Post('attendance')
  recordAttendance(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.recordAttendance(orgId, dto);
  }
}
