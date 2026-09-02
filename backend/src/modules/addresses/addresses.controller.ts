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
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto, QueryAddressesDto } from './dto/addresses.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../../common/guards/org-member.guard';
import { Request } from 'express';

@ApiTags('addresses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), OrgMemberGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List polymorphic addresses' })
  findAll(
    @Headers('x-org-id') orgId: string,
    @Query() query: QueryAddressesDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.addressesService.findAll(effectiveOrgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single address' })
  findOne(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.addressesService.findById(effectiveOrgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  create(
    @Headers('x-org-id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.addressesService.create(effectiveOrgId, userId, dto, req.correlationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update address' })
  update(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAddressDto,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.addressesService.update(effectiveOrgId, id, userId, dto, req.correlationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address' })
  delete(
    @Headers('x-org-id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveOrgId = orgId || (req.user as any)?.orgId;
    return this.addressesService.delete(effectiveOrgId, id, userId, req.correlationId);
  }
}
