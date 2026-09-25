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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  DisqualifyLeadDto,
  ConvertLeadDto,
  AssignLeadDto,
  CheckDuplicatesDto,
  BulkLeadActionDto,
  ImportLeadsDto,
} from './dto/leads.dto';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrgMemberGuard)
@Controller('orgs/:orgId/leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  // ── List ─────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List leads (paginated, filterable by stage/search)' })
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  // ── Pipeline view (grouped by stage) ─────────────────────────────────────
  @Get('pipeline')
  @ApiOperation({ summary: 'Get leads grouped by stage for Kanban view' })
  getPipeline(@Param('orgId') orgId: string) {
    return this.service.getPipeline(orgId);
  }

  // ── Bulk Actions ───────────────────────────────────────────────────────────
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform bulk actions (delete, qualify, disqualify, assign, stage) on leads' })
  bulkAction(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BulkLeadActionDto,
  ) {
    return this.service.bulkAction(orgId, userId, dto);
  }

  // ── CSV Import ────────────────────────────────────────────────────────────
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import leads from CSV/array with automatic scoring' })
  importCsv(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ImportLeadsDto,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.service.importCsv(orgId, userId, dto.rows, dryRun === 'true');
  }

  // ── Duplicate check ───────────────────────────────────────────────────────
  @Post('duplicates/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check for duplicate leads/customers by email, phone, or company' })
  checkDuplicates(@Param('orgId') orgId: string, @Body() dto: CheckDuplicatesDto) {
    return this.service.checkDuplicates(orgId, dto);
  }

  // ── Get one ───────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get a single lead by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  // ── Create + Score ────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Create a new lead and compute AI score' })
  create(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.service.create(orgId, userId, dto);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Update lead fields (score auto-recalculated on key field changes)' })
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  // ── Recalculate score ──────────────────────────────────────────────────────
  @Post(':id/score/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate lead score using current data' })
  recalculateScore(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.recalculateScore(orgId, id);
  }

  // ── Qualify ───────────────────────────────────────────────────────────────
  @Post(':id/qualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lead as QUALIFIED' })
  qualify(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.qualify(orgId, id, userId);
  }

  // ── Disqualify ────────────────────────────────────────────────────────────
  @Post(':id/disqualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lead as UNQUALIFIED with optional reason' })
  disqualify(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: DisqualifyLeadDto,
  ) {
    return this.service.disqualify(orgId, id, userId, dto);
  }

  // ── Convert ───────────────────────────────────────────────────────────────
  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead to Customer + Deal atomically' })
  convert(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.service.convert(orgId, id, userId, dto);
  }

  // ── Assign ────────────────────────────────────────────────────────────────
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign lead using ROUND_ROBIN, LOAD_BASED, or MANUAL strategy' })
  assign(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.service.assign(orgId, id, userId, dto);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete lead permanently' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
