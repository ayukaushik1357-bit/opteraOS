import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';

@ApiTags('purchase')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/purchase')
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @Get('vendors')
  @ApiOperation({ summary: 'List Vendors' })
  getVendors(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getVendors(orgId, query);
  }

  @Get('vendors/:id')
  getVendor(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getVendor(orgId, id);
  }

  @Post('vendors')
  createVendor(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createVendor(orgId, dto);
  }

  @Patch('vendors/:id')
  updateVendor(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateVendor(orgId, id, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List Purchase Orders' })
  getPurchaseOrders(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getPurchaseOrders(orgId, query);
  }

  @Get('orders/:id')
  getPurchaseOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getPurchaseOrder(orgId, id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create Purchase Order' })
  createPurchaseOrder(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createPurchaseOrder(orgId, dto);
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm Purchase Order and generate stock receipt picking' })
  confirmPurchaseOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.confirmPurchaseOrder(orgId, id);
  }

  @Post('orders/:id/receive')
  @ApiOperation({ summary: 'Receive inventory items and update stock levels' })
  receiveStock(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.receiveStock(orgId, id);
  }

  @Get('bills')
  @ApiOperation({ summary: 'List Vendor Bills' })
  getVendorBills(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getVendorBills(orgId, query);
  }

  @Post('bills')
  @ApiOperation({ summary: 'Create Vendor Bill' })
  createVendorBill(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createVendorBill(orgId, dto);
  }
}
