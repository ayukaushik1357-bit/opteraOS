import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get('tree')
  getTree(@Param('orgId') orgId: string) {
    return this.service.getTree(orgId);
  }

  @Get(':id')
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
