import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/manufacturing')
export class ManufacturingController {
  constructor(private readonly service: ManufacturingService) {}

  @Get('boms')
  @ApiOperation({ summary: 'List Bills of Materials' })
  getBOMs(@Param('orgId') orgId: string) {
    return this.service.getBOMs(orgId);
  }

  @Get('boms/:id')
  getBOM(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getBOM(orgId, id);
  }

  @Post('boms')
  @ApiOperation({ summary: 'Create Bill of Materials' })
  createBOM(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createBOM(orgId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List Manufacturing Orders' })
  getManufacturingOrders(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getManufacturingOrders(orgId, query);
  }

  @Get('orders/:id')
  getManufacturingOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getManufacturingOrder(orgId, id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create Manufacturing Order' })
  createManufacturingOrder(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createManufacturingOrder(orgId, dto);
  }

  @Post('orders/:id/complete')
  @ApiOperation({ summary: 'Complete Manufacturing Order, consume components & produce finished inventory' })
  completeManufacturingOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.completeManufacturingOrder(orgId, id);
  }

  @Get('equipments')
  getEquipments(@Param('orgId') orgId: string) {
    return this.service.getEquipments(orgId);
  }

  @Post('equipments')
  createEquipment(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createEquipment(orgId, dto);
  }

  @Get('maintenance')
  getMaintenanceRequests(@Param('orgId') orgId: string) {
    return this.service.getMaintenanceRequests(orgId);
  }

  @Post('maintenance')
  createMaintenanceRequest(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createMaintenanceRequest(orgId, dto);
  }

  @Get('quality-checks')
  getQualityChecks(@Param('orgId') orgId: string) {
    return this.service.getQualityChecks(orgId);
  }

  @Post('quality-checks')
  createQualityCheck(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createQualityCheck(orgId, dto);
  }

  @Post('quality-checks/:id/pass')
  passQualityCheck(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.passQualityCheck(orgId, id, body?.notes);
  }
}
