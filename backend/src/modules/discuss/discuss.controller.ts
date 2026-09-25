import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DiscussService } from './discuss.service';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';

@ApiTags('discuss')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('orgs/:orgId/discuss')
export class DiscussController {
  constructor(private readonly service: DiscussService) {}

  @Get('channels')
  getChannels(@Param('orgId') orgId: string) {
    return this.service.getChannels(orgId);
  }

  @Post('channels')
  createChannel(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createChannel(orgId, dto);
  }

  @Get('channels/:channelId/messages')
  getMessages(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    return this.service.getMessages(orgId, channelId);
  }

  @Post('channels/:channelId/messages')
  sendMessage(
    @Param('orgId') orgId: string,
    @Param('channelId') channelId: string,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    const user = req.user;
    const userId = user?.id || 'anonymous';
    const userName = `${user?.firstName || 'Team'} ${user?.lastName || 'Member'}`.trim();
    return this.service.sendMessage(orgId, channelId, userId, userName, content);
  }
}
