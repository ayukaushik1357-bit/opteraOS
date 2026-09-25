import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto,
  UpdateMemberRoleDto, AcceptInviteDto,
} from './dto/organizations.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(userId, dto);
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
  ) {
    return this.orgsService.update(orgId, userId, dto);
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
  ) {
    return this.orgsService.inviteMember(orgId, userId, dto);
  }

  @Post('invites/accept')
  @ApiOperation({ summary: 'Accept an organization invitation' })
  acceptInvite(@CurrentUser('id') userId: string, @Body() dto: AcceptInviteDto) {
    return this.orgsService.acceptInvite(dto.token, userId);
  }

  @Patch(':orgId/members/:userId/role')
  @ApiOperation({ summary: 'Update a member role' })
  updateRole(
    @Param('orgId') orgId: string,
    @CurrentUser('id') requesterId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(orgId, requesterId, targetUserId, dto);
  }

  @Delete(':orgId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @Param('orgId') orgId: string,
    @CurrentUser('id') requesterId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.orgsService.removeMember(orgId, requesterId, targetUserId);
  }
}
