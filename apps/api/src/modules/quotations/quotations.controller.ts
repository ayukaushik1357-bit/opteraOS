import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuotationsService } from './quotations.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('quotations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/quotations')
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Get()
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/accept')
  accept(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.accept(orgId, id, body);
  }

  @Post(':id/reject')
  reject(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.reject(orgId, id, body?.reason);
  }

  @Post(':id/cancel')
  cancel(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.cancel(orgId, id);
  }

  @Post(':id/approve')
  approve(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.approve(orgId, id);
  }

  @Post(':id/convert-to-order')
  convertToSalesOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.convertToSalesOrder(orgId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
