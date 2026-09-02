import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';

@ApiTags('automations') @ApiBearerAuth() @UseGuards(AuthGuard('jwt')) @Controller('orgs/:orgId/automations')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Get(':id') findOne(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.findOne(orgId, id); }
  @Get(':id/executions') getExecutions(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.getExecutions(orgId, id); }
  @Post() create(@Param('orgId') orgId: string, @Body() dto: any) { return this.service.create(orgId, dto); }
  @Patch(':id') update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(orgId, id, dto); }
  @Post(':id/pause') @HttpCode(HttpStatus.OK) pause(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.pause(orgId, id); }
  @Post(':id/resume') @HttpCode(HttpStatus.OK) resume(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.resume(orgId, id); }
  @Post(':id/run') @HttpCode(HttpStatus.OK) execute(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) { return this.service.execute(orgId, id, body); }
  @Delete(':id') @HttpCode(HttpStatus.OK) remove(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.remove(orgId, id); }
}
