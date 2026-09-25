import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
@ApiTags('orders') @ApiBearerAuth() @UseGuards(AuthGuard('jwt')) @Controller('orgs/:orgId/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Get(':id') findOne(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.findOne(orgId, id); }
  @Post() create(@Param('orgId') orgId: string, @Body() dto: any) { return this.service.create(orgId, dto); }
  @Patch(':id') update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(orgId, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.OK) remove(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.remove(orgId, id); }
}
