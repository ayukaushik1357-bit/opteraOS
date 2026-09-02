import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto, QueryActivitiesDto } from './dto/activities.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List activities across organization or for specific entity' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @Query() query: QueryActivitiesDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.activitiesService.findAll(effectiveOrgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single activity details' })
  findOne(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.activitiesService.findById(effectiveOrgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Log a new activity' })
  create(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateActivityDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.activitiesService.create(effectiveOrgId, userId, dto, req.correlationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update activity status or details' })
  update(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateActivityDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.activitiesService.update(effectiveOrgId, id, userId, dto, req.correlationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete activity' })
  delete(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.activitiesService.delete(effectiveOrgId, id, userId, req.correlationId);
  }
}
