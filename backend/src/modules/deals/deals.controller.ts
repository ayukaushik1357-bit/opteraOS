import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, MoveDealStageDto, CloseDealDto } from './dto/deals.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/deals')
export class DealsController {
  constructor(private readonly service: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List opportunities with filters and pagination' })
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get opportunities grouped by pipeline stages' })
  getPipeline(@Param('orgId') orgId: string, @Query('pipelineId') pipelineId?: string) {
    return this.service.getPipeline(orgId, pipelineId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get pipeline value and win/loss statistics' })
  getStats(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.getStats(orgId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity detail by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: CreateDealDto) {
    return this.service.create(orgId, uid, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an opportunity' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/stage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move opportunity to another pipeline stage' })
  moveStage(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: MoveDealStageDto,
  ) {
    return this.service.moveStage(orgId, uid, id, dto);
  }

  @Post(':id/win')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark opportunity as CLOSED WON' })
  markWon(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: CloseDealDto,
  ) {
    return this.service.markWon(orgId, uid, id, dto);
  }

  @Post(':id/lost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark opportunity as CLOSED LOST with reason' })
  markLost(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: CloseDealDto,
  ) {
    return this.service.markLost(orgId, uid, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an opportunity' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
