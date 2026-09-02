import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('accounts')
  getAccounts(@Param('orgId') orgId: string) {
    return this.service.getAccounts(orgId);
  }

  @Post('accounts')
  createAccount(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createAccount(orgId, dto);
  }

  @Post('accounts/seed')
  seedAccounts(@Param('orgId') orgId: string) {
    return this.service.seedAccounts(orgId);
  }

  @Get('journal-entries')
  getJournalEntries(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.getJournalEntries(orgId, q);
  }

  @Post('journal-entries')
  createJournalEntry(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createJournalEntry(orgId, dto);
  }

  @Get('reports')
  getReports(@Param('orgId') orgId: string) {
    return this.service.getReports(orgId);
  }

  @Get('expenses')
  getExpenses(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.getExpenses(orgId, q);
  }

  @Post('expenses')
  createExpense(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createExpense(orgId, dto);
  }
}
