import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, CancelOrderDto } from './dto/orders.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List sales orders with filters' })
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales order detail by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Get(':id/invoice-context')
  @ApiOperation({ summary: 'Get order details formatted for Invoicing contract' })
  getInvoiceContext(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getInvoiceContext(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sales order' })
  create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: CreateOrderDto) {
    return this.service.create(orgId, uid, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sales order' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm sales order & emit fulfillment domain event' })
  confirm(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.service.confirmOrder(orgId, id, uid);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a sales order' })
  cancel(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.service.cancelOrder(orgId, id, dto, uid);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a draft sales order' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
