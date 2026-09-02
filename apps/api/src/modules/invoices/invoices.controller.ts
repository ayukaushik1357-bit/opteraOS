import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Get('stats') getStats(@Param('orgId') orgId: string) { return this.service.getStats(orgId); }
  @Get(':id') findOne(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.findOne(orgId, id); }
  @Post() create(@Param('orgId') orgId: string, @Body() dto: any) { return this.service.create(orgId, dto); }
  @Patch(':id') update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(orgId, id, dto); }
  @Post(':id/send') @HttpCode(HttpStatus.OK) markSent(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.markSent(orgId, id); }
  @Post(':id/pay') @HttpCode(HttpStatus.OK) markPaid(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) { return this.service.markPaid(orgId, id, body?.amount); }
  @Delete(':id') @HttpCode(HttpStatus.OK) remove(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.remove(orgId, id); }
}
