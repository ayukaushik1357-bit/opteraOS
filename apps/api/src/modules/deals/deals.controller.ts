import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto } from './dto/deals.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/deals')
export class DealsController {
  constructor(private readonly service: DealsService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Get('pipeline') getPipeline(@Param('orgId') orgId: string) { return this.service.getPipeline(orgId); }
  @Get('stats') getStats(@Param('orgId') orgId: string) { return this.service.getStats(orgId); }
  @Get(':id') findOne(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.findOne(orgId, id); }
  @Post() create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: CreateDealDto) { return this.service.create(orgId, uid, dto); }
  @Patch(':id') update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateDealDto) { return this.service.update(orgId, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.OK) remove(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.remove(orgId, id); }
}
