import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get('timesheets')
  getTimesheets(@Param('orgId') orgId: string) {
    return this.service.getTimesheets(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/tasks')
  addTask(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.addTask(orgId, id, dto);
  }

  @Post(':id/timesheets')
  logTime(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.logTime(orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
