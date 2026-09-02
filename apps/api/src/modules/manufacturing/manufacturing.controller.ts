import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/manufacturing')
export class ManufacturingController {
  constructor(private readonly service: ManufacturingService) {}

  @Get('boms')
  getBOMs(@Param('orgId') orgId: string) {
    return this.service.getBOMs(orgId);
  }

  @Post('boms')
  createBOM(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createBOM(orgId, dto);
  }

  @Get('orders')
  getOrders(@Param('orgId') orgId: string) {
    return this.service.getOrders(orgId);
  }

  @Post('orders')
  createOrder(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createOrder(orgId, dto);
  }

  @Post('orders/:id/complete')
  completeOrder(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.completeOrder(orgId, id);
  }
}
