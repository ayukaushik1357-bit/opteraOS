import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/departments.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List departments' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.departmentsService.findAll(effectiveOrgId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get department hierarchy tree' })
  getTree(
    @Headers('x-org-id') orgId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.departmentsService.getTree(effectiveOrgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single department' })
  findOne(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.departmentsService.findById(effectiveOrgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new department' })
  create(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDepartmentDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.departmentsService.create(effectiveOrgId, userId, dto, req.correlationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department' })
  update(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.departmentsService.update(effectiveOrgId, id, userId, dto, req.correlationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete department' })
  delete(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.departmentsService.delete(effectiveOrgId, id, userId, req.correlationId);
  }
}
