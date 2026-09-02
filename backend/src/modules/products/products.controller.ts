import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateProductVariantDto, GenerateVariantMatrixDto } from './dto/products.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  findAll(@Param('orgId') orgId: string, @Query() q: any) {
    return this.service.findAll(orgId, q);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List product categories' })
  getCategories(@Param('orgId') orgId: string) {
    return this.service.getCategories(orgId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a product category' })
  createCategory(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.service.createCategory(orgId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  create(@Param('orgId') orgId: string, @Body() dto: CreateProductDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(orgId, id, dto);
  }

  @Post(':id/variants/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate matrix of variants from attributes' })
  generateVariants(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: GenerateVariantMatrixDto,
  ) {
    return this.service.generateVariants(orgId, id, dto);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Create a single product variant' })
  createVariant(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.service.createVariant(orgId, id, dto);
  }

  @Post(':id/stock-adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust stock inventory quantity' })
  adjustStock(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @Body() body: { quantity: number; type: any; notes?: string },
  ) {
    return this.service.adjustStock(orgId, id, body.quantity, body.type, body.notes, uid);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a product' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
