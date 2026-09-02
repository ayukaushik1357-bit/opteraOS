import { Controller, Get, Post, Patch, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('notifications') @ApiBearerAuth() @UseGuards(AuthGuard('jwt')) @Controller('orgs/:orgId/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() findAll(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Query() q: any) { return this.service.findAll(orgId, uid, q); }
  @Get('unread-count') getCount(@Param('orgId') orgId: string, @CurrentUser('id') uid: string) { return this.service.getUnreadCount(orgId, uid); }
  @Patch(':id/read') @HttpCode(HttpStatus.OK) markRead(@Param('orgId') orgId: string, @CurrentUser('id') uid: string, @Param('id') id: string) { return this.service.markRead(orgId, uid, id); }
  @Post('mark-all-read') @HttpCode(HttpStatus.OK) markAllRead(@Param('orgId') orgId: string, @CurrentUser('id') uid: string) { return this.service.markAllRead(orgId, uid); }
}
