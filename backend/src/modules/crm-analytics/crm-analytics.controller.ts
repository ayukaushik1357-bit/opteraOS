import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CRMAnalyticsService } from './crm-analytics.service';

@ApiTags('crm-analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/crm-analytics')
export class CRMAnalyticsController {
  constructor(private readonly service: CRMAnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get CRM & Sales Executive Summary metrics' })
  getExecutiveSummary(@Param('orgId') orgId: string) {
    return this.service.getExecutiveSummary(orgId);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get sales forecast by period and leaderboard' })
  getForecast(@Param('orgId') orgId: string, @Query('pipelineId') pipelineId?: string) {
    return this.service.getForecast(orgId, pipelineId);
  }
}
