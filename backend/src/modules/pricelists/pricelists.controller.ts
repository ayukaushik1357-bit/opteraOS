import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PriceListsService } from './pricelists.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('pricelists')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/pricelists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}

  @Get()
  findAll(@Param('orgId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get('resolve')
  resolvePrice(
    @Param('orgId') orgId: string,
    @Query('productId') productId: string,
    @Query('quantity') quantity: number,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.resolvePrice(orgId, productId, Number(quantity) || 1, customerId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Post(':id/rules')
  addRule(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.addRule(orgId, id, dto);
  }

  @Delete(':id/rules/:ruleId')
  @HttpCode(HttpStatus.OK)
  removeRule(@Param('orgId') orgId: string, @Param('id') id: string, @Param('ruleId') ruleId: string) {
    return this.service.removeRule(orgId, id, ruleId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
