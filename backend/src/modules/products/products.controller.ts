import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}
  @Get() findAll(@Param('orgId') orgId: string, @Query() q: any) { return this.service.findAll(orgId, q); }
  @Get('low-stock') getLowStock(@Param('orgId') orgId: string) { return this.service.getLowStockAlerts(orgId); }
  @Get('categories') getCategories(@Param('orgId') orgId: string) { return this.service.getCategories(orgId); }
  @Post('categories') createCategory(@Param('orgId') orgId: string, @Body() dto: any) { return this.service.createCategory(orgId, dto); }
  @Get(':id') findOne(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.findOne(orgId, id); }
  @Post() create(@Param('orgId') orgId: string, @Body() dto: any) { return this.service.create(orgId, dto); }
  @Patch(':id') update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(orgId, id, dto); }
  @Post(':id/stock') @HttpCode(HttpStatus.OK) adjustStock(
    @Param('orgId') orgId: string, @Param('id') id: string,
    @Body() body: any, @CurrentUser('id') uid: string,
  ) { return this.service.adjustStock(orgId, id, body.quantity, body.type, body.notes, uid); }
  @Delete(':id') @HttpCode(HttpStatus.OK) remove(@Param('orgId') orgId: string, @Param('id') id: string) { return this.service.remove(orgId, id); }
}
