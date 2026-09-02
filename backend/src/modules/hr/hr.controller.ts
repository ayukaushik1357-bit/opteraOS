import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HrService } from './hr.service';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @Get('employees')
  @ApiOperation({ summary: 'List Employees' })
  getEmployees(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getEmployees(orgId, query);
  }

  @Get('employees/:id')
  getEmployee(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getEmployee(orgId, id);
  }

  @Post('employees')
  createEmployee(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createEmployee(orgId, dto);
  }

  @Patch('employees/:id')
  updateEmployee(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateEmployee(orgId, id, dto);
  }

  @Get('time-off')
  @ApiOperation({ summary: 'List Time Off / Leave Requests' })
  getTimeOffRequests(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getTimeOffRequests(orgId, query);
  }

  @Post('time-off')
  createTimeOffRequest(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createTimeOffRequest(orgId, dto);
  }

  @Post('time-off/:id/approve')
  approveTimeOff(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.approveTimeOff(orgId, id);
  }

  @Get('attendance')
  getAttendance(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getAttendance(orgId, query);
  }

  @Post('attendance')
  logAttendance(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.logAttendance(orgId, dto);
  }

  @Get('jobs')
  getJobs(@Param('orgId') orgId: string) {
    return this.service.getJobs(orgId);
  }

  @Post('jobs')
  createJob(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createJob(orgId, dto);
  }

  @Get('applicants')
  getApplicants(@Param('orgId') orgId: string, @Query('jobId') jobId?: string) {
    return this.service.getApplicants(orgId, jobId);
  }

  @Post('applicants')
  createApplicant(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createApplicant(orgId, dto);
  }

  @Patch('applicants/:id/stage')
  updateApplicantStage(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.updateApplicantStage(orgId, id, body.stage, body.status);
  }
}
