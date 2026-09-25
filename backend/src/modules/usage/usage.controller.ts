import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsageControlService } from './usage-control.service';
import { CostGuardService } from './cost-guard.service';

@ApiTags('usage')
@Controller('orgs/:orgId/usage')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard, RolesGuard)
export class UsageController {
  constructor(
    private usageControl: UsageControlService,
    private costGuard: CostGuardService,
  ) {}

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get current organization usage and quota limits' })
  async getSummary(@Param('orgId') orgId: string) {
    return this.usageControl.getUsageSummary(orgId);
  }

  @Get('ledger')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed usage ledger history (Admin only)' })
  async getLedger(@Param('orgId') orgId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.costGuard.getUsageLedger(orgId, parsedLimit);
  }
}
