import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HelpdeskService } from './helpdesk.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('helpdesk')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/helpdesk')
export class HelpdeskController {
  constructor(private readonly service: HelpdeskService) {}

  @Get('tickets')
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get('tickets/:id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post('tickets')
  create(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch('tickets/:id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(orgId, id, dto);
  }

  @Post('tickets/:id/comments')
  addComment(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.addComment(orgId, id, dto);
  }

  @Delete('tickets/:id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
