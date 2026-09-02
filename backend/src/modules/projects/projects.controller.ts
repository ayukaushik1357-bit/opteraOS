import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List Projects' })
  getProjects(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getProjects(orgId, query);
  }

  @Get(':id')
  getProject(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getProject(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create Project' })
  createProject(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createProject(orgId, dto);
  }

  @Patch(':id')
  updateProject(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateProject(orgId, id, dto);
  }

  @Get('timesheets/list')
  @ApiOperation({ summary: 'List Timesheets' })
  getTimesheets(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getTimesheets(orgId, query);
  }

  @Post('timesheets/log')
  @ApiOperation({ summary: 'Log Timesheet Hours' })
  logTimesheet(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: any) {
    return this.service.logTimesheet(orgId, uid, dto);
  }

  @Get('field-service/orders')
  getFieldServiceOrders(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getFieldServiceOrders(orgId, query);
  }

  @Post('field-service/orders')
  createFieldServiceOrder(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createFieldServiceOrder(orgId, dto);
  }
}
