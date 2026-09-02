import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PricelistsService } from './pricelists.service';
import { CreatePriceListDto, UpdatePriceListDto, CreatePriceListItemDto, CalculatePriceDto } from './dto/pricelists.dto';

@ApiTags('pricelists')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/pricelists')
export class PricelistsController {
  constructor(private readonly service: PricelistsService) {}

  @Get()
  @ApiOperation({ summary: 'List pricelists for organization' })
  findAll(@Param('orgId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pricelist by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new pricelist' })
  create(@Param('orgId') orgId: string, @Body() dto: CreatePriceListDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pricelist' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.service.update(orgId, id, dto);
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate product price based on quantity and pricelist rules' })
  calculatePrice(@Param('orgId') orgId: string, @Body() dto: CalculatePriceDto) {
    return this.service.calculatePrice(orgId, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add a rule item to a pricelist' })
  addItem(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: CreatePriceListItemDto) {
    return this.service.addItem(orgId, id, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a rule item from a pricelist' })
  removeItem(@Param('orgId') orgId: string, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(orgId, id, itemId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a pricelist' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
