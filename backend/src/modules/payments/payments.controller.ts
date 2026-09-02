import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('payments/config')
  getConfig() { return this.service.getSubscriptionConfig(); }

  @Post('orgs/:orgId/payments/create-order')
  @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
  createOrder(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createOrder(orgId, dto);
  }

  @Post('orgs/:orgId/payments/verify')
  @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  verifyPayment(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.verifyPayment(orgId, dto);
  }

  // IMPORTANT: Raw body needed for HMAC signature verification
  @Post('webhooks/razorpay')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('x-razorpay-signature') sig: string,
  ) {
    return this.service.handleWebhook(req.rawBody, sig);
  }
}
