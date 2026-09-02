import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Get('stats') getStats(@Param('orgId') orgId: string) { return this.service.getStats(orgId); }
  @Get(':id') findOne(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.findOne(orgId, id); }
  @Post() create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: any) { return this.service.create(orgId, uid, dto); }
  @Patch(':id') update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(orgId, id, dto); }
  @Post(':id/complete') @HttpCode(HttpStatus.OK) complete(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.complete(orgId, id); }
  @Delete(':id') @HttpCode(HttpStatus.OK) remove(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.remove(orgId, id); }
}
