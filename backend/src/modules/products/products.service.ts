import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, CreateProductVariantDto, GenerateVariantMatrixDto } from './dto/products.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, categoryId, lowStock, isSaleable, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId, isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (isSaleable !== undefined) where.isSaleable = isSaleable === 'true';

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { internalRef: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          variants: { where: { isActive: true } },
          _count: { select: { variants: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / Number(pageSize)),
    };
  }

  async findOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: {
        category: true,
        variants: { where: { isActive: true } },
        inventoryMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(orgId: string, dto: CreateProductDto) {
    const { variants, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        organizationId: orgId,
        hasVariants: (variants && variants.length > 0) || dto.hasVariants || false,
        variants: variants && variants.length > 0 ? {
          create: variants.map((v) => ({
            organizationId: orgId,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode,
            priceAdjustment: v.priceAdjustment || 0,
            costAdjustment: v.costAdjustment || 0,
            stock: v.stock || 0,
            attributeValues: v.attributeValues || {},
          })),
        } : undefined,
      },
      include: { category: true, variants: true },
    });
  }

  async update(orgId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(orgId, id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, variants: true },
    });
  }

  /**
   * Generates a variant combination matrix from provided attribute lists.
   * e.g. Color (Red, Blue) x Size (S, M, L) => 6 product variants.
   */
  async generateVariants(orgId: string, productId: string, dto: GenerateVariantMatrixDto) {
    const product = await this.findOne(orgId, productId);
    const { attributes } = dto;

    if (!attributes || attributes.length === 0) {
      throw new BadRequestException('At least one attribute with values is required.');
    }

    // Cartesian product of attribute values
    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap((a) => curr.map((c) => [...a, c]));
      }, [[]] as string[][]);
    };

    const valueLists = attributes.map((a) => a.values);
    const combinations = cartesian(valueLists);

    const createdVariants = [];
    for (const combo of combinations) {
      const attrMap: Record<string, string> = {};
      attributes.forEach((attr, idx) => {
        attrMap[attr.name] = combo[idx];
      });

      const variantName = `${product.name} (${combo.join(' / ')})`;
      const variantSku = `${product.sku || 'SKU'}-${combo.join('-').toUpperCase().replace(/\s+/g, '')}`;

      const v = await this.prisma.productVariant.create({
        data: {
          organizationId: orgId,
          productId,
          name: variantName,
          sku: variantSku,
          attributeValues: attrMap as any,
          stock: 0,
          priceAdjustment: 0,
        },
      });
      createdVariants.push(v);
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return {
      message: `Generated ${createdVariants.length} variants successfully`,
      variants: createdVariants,
    };
  }

  async createVariant(orgId: string, productId: string, dto: CreateProductVariantDto) {
    await this.findOne(orgId, productId);
    const variant = await this.prisma.productVariant.create({
      data: {
        ...dto,
        organizationId: orgId,
        productId,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return variant;
  }

  async adjustStock(orgId: string, id: string, quantity: number, type: any, notes?: string, createdById?: string) {
    const product = await this.findOne(orgId, id);
    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { stock: newStock } }),
      this.prisma.inventoryMovement.create({
        data: { organizationId: orgId, productId: id, type, quantity, previousStock, newStock, notes, createdById },
      }),
    ]);

    return this.findOne(orgId, id);
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { message: 'Product archived' };
  }

  async getCategories(orgId: string) {
    return this.prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } });
  }

  async createCategory(orgId: string, dto: any) {
    return this.prisma.category.create({ data: { ...dto, organizationId: orgId } });
  }
}
