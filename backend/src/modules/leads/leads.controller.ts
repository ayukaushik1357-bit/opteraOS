import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto, UpdateLeadDto, ConvertLeadDto, AssignLeadDto, CheckDuplicateDto, BulkLeadActionDto,
} from './dto/leads.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads with pagination and filters' })
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get leads grouped by stage' })
  getPipeline(@Param('orgId') orgId: string) {
    return this.service.getPipeline(orgId);
  }

  @Post('duplicates/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check for potential duplicate leads/contacts' })
  checkDuplicates(@Param('orgId') orgId: string, @Body() dto: CheckDuplicateDto) {
    return this.service.checkDuplicates(orgId, dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute bulk action on leads' })
  bulkAction(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: BulkLeadActionDto) {
    return this.service.bulkAction(orgId, uid, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import leads from parsed CSV data' })
  importCsv(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Body('rows') rows: Array<Record<string, any>>,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.service.importCsv(orgId, uid, rows || [], dryRun === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead detail by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: CreateLeadDto) {
    return this.service.create(orgId, uid, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/score/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate AI/rule score for lead' })
  recalculateScore(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.recalculateScore(orgId, id);
  }

  @Post(':id/qualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lead as QUALIFIED' })
  qualify(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.qualify(orgId, id);
  }

  @Post(':id/disqualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lead as UNQUALIFIED with reason' })
  disqualify(@Param('orgId') orgId: string, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.disqualify(orgId, id, reason);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead into customer, contact, and opportunity' })
  convert(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.service.convert(orgId, uid, id, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign lead to salesperson using strategy' })
  assignLead(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.service.assignLead(orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a lead' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
