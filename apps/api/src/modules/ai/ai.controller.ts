import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard, ThrottlerGuard)
@Controller('orgs/:orgId/ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Get('conversations')
  listConversations(@Param('orgId') orgId: string, @CurrentUser('id') uid: string) {
    return this.service.listConversations(orgId, uid);
  }

  @Post('conversations')
  createConversation(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Body() body: any) {
    return this.service.createConversation(orgId, uid, body?.title);
  }

  @Get('conversations/:id')
  getConversation(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.service.getConversation(orgId, uid, id);
  }

  @Patch('conversations/:id')
  renameConversation(
    @Param('orgId') orgId: string, @CurrentUser('id') uid: string,
    @Param('id') id: string, @Body() body: any,
  ) { return this.service.renameConversation(orgId, uid, id, body.title); }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  deleteConversation(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.service.deleteConversation(orgId, uid, id);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async directChat(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Body() body: any,
  ) {
    const message = body?.message || body?.prompt || 'Hello';
    const conv = await this.service.createConversation(orgId, uid || 'anonymous', 'Quick Chat');
    return this.service.chat(orgId, uid || 'anonymous', conv.id, message);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  chat(
    @Param('orgId') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) { return this.service.chat(orgId, uid, id, body.message); }
}
