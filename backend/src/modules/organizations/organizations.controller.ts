import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateMemberStatusDto,
  AcceptInviteDto,
} from './dto/organizations.dto';
import { Request } from 'express';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.orgsService.create(userId, dto, req.correlationId);
  }

  @Get(':orgId')
  @ApiOperation({ summary: 'Get organization details' })
  findOne(@Param('orgId') orgId: string) {
    return this.orgsService.findById(orgId);
  }

  @Patch(':orgId')
  @ApiOperation({ summary: 'Update organization' })
  update(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: Request,
  ) {
    return this.orgsService.update(orgId, userId, dto, req.correlationId);
  }

  @Get(':orgId/members')
  @ApiOperation({ summary: 'List organization members' })
  getMembers(@Param('orgId') orgId: string) {
    return this.orgsService.getMembers(orgId);
  }

  @Post(':orgId/invite')
  @ApiOperation({ summary: 'Invite a member to the organization' })
  invite(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: Request,
  ) {
    return this.orgsService.inviteMember(orgId, userId, dto, req.correlationId);
  }

  @Post('invites/accept')
  @ApiOperation({ summary: 'Accept an organization invitation' })
  acceptInvite(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptInviteDto,
    @Req() req: Request,
  ) {
    return this.orgsService.acceptInvite(dto.token, userId, req.correlationId);
  }

  @Patch(':orgId/members/:userId/role')
  @ApiOperation({ summary: 'Update a member role' })
  updateRole(
    @Param('orgId') orgId: string,
    @CurrentUser('id') requesterId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: Request,
  ) {
    return this.orgsService.updateMemberRole(orgId, requesterId, targetUserId, dto, req.correlationId);
  }

  @Patch(':orgId/members/:userId/status')
  @ApiOperation({ summary: 'Update a member status (ACTIVE, SUSPENDED, REMOVED)' })
  updateStatus(
    @Param('orgId') orgId: string,
    @CurrentUser('id') requesterId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberStatusDto,
    @Req() req: Request,
  ) {
    return this.orgsService.updateMemberStatus(orgId, requesterId, targetUserId, dto, req.correlationId);
  }

  @Delete(':orgId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @Param('orgId') orgId: string,
    @CurrentUser('id') requesterId: string,
    @Param('userId') targetUserId: string,
    @Req() req: Request,
  ) {
    return this.orgsService.removeMember(orgId, requesterId, targetUserId, req.correlationId);
  }
}
