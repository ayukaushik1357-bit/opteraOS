import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('orgs/:orgId/payments')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  getPayments(@Param('orgId') orgId: string) {
    return this.service.getPayments(orgId);
  }

  @Post('orgs/:orgId/payments/record')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  recordPayment(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.recordInvoicePayment(orgId, dto);
  }
}
