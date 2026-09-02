import {
  Controller,
  Get,
  Post,
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
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/attachments.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List attachments for an entity' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.attachmentsService.findAll(effectiveOrgId, entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single attachment metadata' })
  findOne(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.attachmentsService.findById(effectiveOrgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Record attachment metadata' })
  create(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAttachmentDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.attachmentsService.create(effectiveOrgId, userId, dto, req.correlationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment record' })
  delete(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.attachmentsService.delete(effectiveOrgId, id, userId, req.correlationId);
  }
}
