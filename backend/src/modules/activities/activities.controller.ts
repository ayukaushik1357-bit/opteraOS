import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('activities') @ApiBearerAuth() @UseGuards(AuthGuard('jwt')) @Controller('orgs/:orgId/activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Post() create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: any) { return this.service.create(orgId, uid, dto); }
}
