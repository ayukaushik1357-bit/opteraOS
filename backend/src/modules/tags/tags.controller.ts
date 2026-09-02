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
import { TagsService } from './tags.service';
import { CreateTagDto, AttachTagDto } from './dto/tags.dto';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @Query('category') category: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.tagsService.findAll(effectiveOrgId, category);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  create(
    @Headers('x-org-id') orgId: string,
    @Body() dto: CreateTagDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.tagsService.create(effectiveOrgId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  delete(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.tagsService.delete(effectiveOrgId, id);
  }

  @Post('attach')
  @ApiOperation({ summary: 'Attach a tag to an entity' })
  attach(
    @Headers('x-org-id') orgId: string,
    @Body() dto: AttachTagDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.tagsService.attachToEntity(effectiveOrgId, dto);
  }

  @Delete('detach/:tagId')
  @ApiOperation({ summary: 'Detach a tag from an entity' })
  detach(
    @Headers('x-org-id') orgId: string,
    @Param('tagId') tagId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.tagsService.detachFromEntity(effectiveOrgId, tagId, entityType, entityId);
  }

  @Get('entity')
  @ApiOperation({ summary: 'Get tags for an entity' })
  getEntityTags(
    @Headers('x-org-id') orgId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.tagsService.getEntityTags(effectiveOrgId, entityType, entityId);
  }
}
