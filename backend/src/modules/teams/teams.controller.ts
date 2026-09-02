import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from './dto/teams.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List teams' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @Query('departmentId') departmentId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.findAll(effectiveOrgId, departmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single team with members' })
  findOne(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.findById(effectiveOrgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  create(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.create(effectiveOrgId, userId, dto, req.correlationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team details' })
  update(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.update(effectiveOrgId, id, userId, dto, req.correlationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team' })
  delete(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.delete(effectiveOrgId, id, userId, req.correlationId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to team' })
  addMember(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.addMember(effectiveOrgId, id, userId, dto, req.correlationId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from team' })
  removeMember(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.teamsService.removeMember(effectiveOrgId, id, memberId, userId, req.correlationId);
  }
}
