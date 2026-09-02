import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HelpdeskService } from './helpdesk.service';

@ApiTags('helpdesk')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/helpdesk')
export class HelpdeskController {
  constructor(private readonly service: HelpdeskService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List Helpdesk Tickets' })
  getTickets(@Param('orgId') orgId: string, @Query() query: any) {
    return this.service.getTickets(orgId, query);
  }

  @Get('tickets/:id')
  getTicket(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.getTicket(orgId, id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create Support Ticket' })
  createTicket(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createTicket(orgId, dto);
  }

  @Patch('tickets/:id')
  updateTicket(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateTicket(orgId, id, dto);
  }

  @Post('tickets/:id/resolve')
  resolveTicket(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.resolveTicket(orgId, id);
  }
}
