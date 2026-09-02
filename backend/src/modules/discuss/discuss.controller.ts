import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscussService } from './discuss.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('discuss')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/discuss')
export class DiscussController {
  constructor(private readonly service: DiscussService) {}

  @Get('channels')
  @ApiOperation({ summary: 'List discussion channels' })
  getChannels(@Param('orgId') orgId: string) {
    return this.service.getChannels(orgId);
  }

  @Post('channels')
  createChannel(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createChannel(orgId, dto);
  }

  @Get('channels/:channelId/messages')
  getChannelMessages(@Param('orgId') orgId: string, @Param('channelId') channelId: string) {
    return this.service.getChannelMessages(orgId, channelId);
  }

  @Post('channels/:channelId/messages')
  postMessage(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('channelId') channelId: string,
    @Body() dto: any,
  ) {
    return this.service.postMessage(orgId, uid, channelId, dto);
  }

  @Get('documents')
  getDocuments(@Param('orgId') orgId: string, @Query('category') cat?: string) {
    return this.service.getDocuments(orgId, cat);
  }

  @Post('documents')
  createDocument(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createDocument(orgId, dto);
  }

  @Get('signatures')
  getSignatures(@Param('orgId') orgId: string) {
    return this.service.getSignatureRequests(orgId);
  }

  @Post('signatures')
  createSignatureRequest(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createSignatureRequest(orgId, dto);
  }

  @Post('signatures/:id/sign')
  signDocument(@Param('orgId') orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.signDocument(orgId, id, body?.auditHash);
  }
}
