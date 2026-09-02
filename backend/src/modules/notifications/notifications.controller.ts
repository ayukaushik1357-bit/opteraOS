import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications for active organization' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') uid: string,
    @Query() q: any,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.service.findAll(effectiveOrgId, uid, q);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  getCount(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') uid: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.service.getUnreadCount(effectiveOrgId, uid);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark single notification as read' })
  markRead(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.service.markRead(effectiveOrgId, uid, id);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') uid: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.service.markAllRead(effectiveOrgId, uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dismiss / delete notification' })
  delete(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') uid: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.service.delete(effectiveOrgId, uid, id);
  }
}
