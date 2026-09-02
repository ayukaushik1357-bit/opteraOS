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
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDefinitionDto,
  UpdateCustomFieldDefinitionDto,
  SetCustomFieldValueDto,
} from './dto/custom-fields.dto';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('custom-fields')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'List custom field definitions' })
  getDefinitions(
    @Headers('x-org-id') orgId: string,
    @Query('entityType') entityType: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.customFieldsService.getDefinitions(effectiveOrgId, entityType);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create a custom field definition' })
  createDefinition(
    @Headers('x-org-id') orgId: string,
    @Body() dto: CreateCustomFieldDefinitionDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.customFieldsService.createDefinition(effectiveOrgId, dto);
  }

  @Patch('definitions/:id')
  @ApiOperation({ summary: 'Update a custom field definition' })
  updateDefinition(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefinitionDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.customFieldsService.updateDefinition(effectiveOrgId, id, dto);
  }

  @Delete('definitions/:id')
  @ApiOperation({ summary: 'Delete a custom field definition' })
  deleteDefinition(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.customFieldsService.deleteDefinition(effectiveOrgId, id);
  }

  @Post('values')
  @ApiOperation({ summary: 'Set custom field value on an entity' })
  setValue(
    @Headers('x-org-id') orgId: string,
    @Body() dto: SetCustomFieldValueDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.customFieldsService.setFieldValue(effectiveOrgId, dto);
  }

  @Get('values')
  @ApiOperation({ summary: 'Get custom field values for an entity' })
  getEntityValues(
    @Headers('x-org-id') orgId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.customFieldsService.getEntityFieldValues(effectiveOrgId, entityType, entityId);
  }
}
