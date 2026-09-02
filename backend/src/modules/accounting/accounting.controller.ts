import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List Chart of Accounts' })
  getAccounts(@Param('orgId') orgId: string) {
    return this.service.getAccounts(orgId);
  }

  @Post('accounts/seed')
  @ApiOperation({ summary: 'Seed standard standard Chart of Accounts' })
  seedAccounts(@Param('orgId') orgId: string) {
    return this.service.seedStandardCoA(orgId);
  }

  @Get('accounts/:id')
  getAccount(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getAccount(orgId, id);
  }

  @Post('accounts')
  createAccount(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createAccount(orgId, dto);
  }

  @Patch('accounts/:id')
  updateAccount(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateAccount(orgId, id, dto);
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'List General Ledger Journal Entries' })
  getJournalEntries(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getJournalEntries(orgId, query);
  }

  @Get('journal-entries/:id')
  getJournalEntry(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getJournalEntry(orgId, id);
  }

  @Post('journal-entries')
  @ApiOperation({ summary: 'Post balanced double-entry Journal Entry' })
  createJournalEntry(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createJournalEntry(orgId, dto);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get Balance Sheet and Profit & Loss reports' })
  getFinancialReports(@Param('orgId') orgId: string) {
    return this.service.getFinancialReports(orgId);
  }

  @Get('expenses')
  getExpenses(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getExpenses(orgId, query);
  }

  @Post('expenses')
  createExpense(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createExpense(orgId, dto);
  }

  @Get('taxes')
  getTaxes(@Param('orgId') orgId: string) {
    return this.service.getTaxes(orgId);
  }

  @Post('taxes')
  createTax(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createTax(orgId, dto);
  }
}
