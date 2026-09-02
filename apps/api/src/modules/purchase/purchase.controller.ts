import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('purchase')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/purchase')
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @Get('vendors')
  getVendors(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.getVendors(orgId, q);
  }

  @Post('vendors')
  createVendor(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createVendor(orgId, dto);
  }

  @Get('orders')
  getPurchaseOrders(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.getPurchaseOrders(orgId, q);
  }

  @Get('orders/:id')
  findOnePO(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOnePO(orgId, id);
  }

  @Post('orders')
  createPurchaseOrder(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createPurchaseOrder(orgId, dto);
  }

  @Post('orders/:id/receive')
  receivePurchaseOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.receivePurchaseOrder(orgId, id);
  }

  @Get('bills')
  getBills(@Param('orgId') orgId: string) {
    return this.service.getBills(orgId);
  }

  @Post('bills')
  createBill(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createBill(orgId, dto);
  }
}
