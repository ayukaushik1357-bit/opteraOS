import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
@ApiTags('analytics') @ApiBearerAuth() @UseGuards(AuthGuard('jwt')) @Controller('orgs/:orgId/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('dashboard') getDashboard(@Param('orgId') orgId: string, @Query('period') period: string) { return this.service.getDashboard(orgId, period); }
  @Get('revenue-trend') getRevenueTrend(@Param('orgId') orgId: string, @Query('months') months: string) { return this.service.getRevenueTrend(orgId, Number(months) || 6); }
  @Get('customer-growth') getCustomerGrowth(@Param('orgId') orgId: string, @Query('months') months: string) { return this.service.getCustomerGrowth(orgId, Number(months) || 6); }
  @Get('pipeline') getPipeline(@Param('orgId') orgId: string) { return this.service.getSalesPipeline(orgId); }
  @Get('top-products') getTopProducts(@Param('orgId') orgId: string, @Query('limit') limit: string) { return this.service.getTopProducts(orgId, Number(limit) || 10); }
  @Get('ai-insights') getAIInsights(@Param('orgId') orgId: string) { return this.service.getAIInsights(orgId); }
}
