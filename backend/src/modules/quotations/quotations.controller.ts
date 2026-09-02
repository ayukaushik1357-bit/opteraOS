import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Res, Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotationsService } from './quotations.service';
import {
  CreateQuotationDto, UpdateQuotationDto, SendQuotationEmailDto, AcceptQuotationDto, RejectQuotationDto,
} from './dto/quotations.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('quotations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/quotations')
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Get()
  @ApiOperation({ summary: 'List quotations with filters' })
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation detail by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  create(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() dto: CreateQuotationDto) {
    return this.service.create(orgId, uid, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft quotation' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return this.service.update(orgId, id, dto);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download or stream quotation PDF document' })
  async getPdf(@Param('orgId') orgId: string, @Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.service.generatePdf(orgId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quotation-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send quotation PDF to customer via email' })
  sendEmail(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: SendQuotationEmailDto,
  ) {
    return this.service.sendQuotationEmail(orgId, id, dto, uid);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept quotation and generate confirmed Sales Order' })
  accept(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: AcceptQuotationDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.service.acceptQuotation(orgId, id, dto, uid, ip);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject quotation with reason' })
  reject(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() dto: RejectQuotationDto,
  ) {
    return this.service.rejectQuotation(orgId, id, dto, uid);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel quotation' })
  cancel(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.cancelQuotation(orgId, id);
  }

  @Post(':id/approve-discount')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve quotation discount (Manager action)' })
  approveDiscount(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.service.approveDiscount(orgId, id, uid);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a quotation' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
