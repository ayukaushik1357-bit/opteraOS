import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePriceListDto, UpdatePriceListDto, CreatePriceListItemDto, CalculatePriceDto } from './dto/pricelists.dto';
import { PricingType } from '@prisma/client';

@Injectable()
export class PricelistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.priceList.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, price: true } },
            productVariant: { select: { id: true, name: true, sku: true } },
            category: { select: { id: true, name: true } },
          },
        },
        _count: { select: { items: true, quotations: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const pl = await this.prisma.priceList.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, price: true } },
            productVariant: { select: { id: true, name: true, sku: true } },
            category: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!pl) throw new NotFoundException('Pricelist not found');
    return pl;
  }

  async create(orgId: string, dto: CreatePriceListDto) {
    const { items, ...plData } = dto;

    if (dto.isDefault) {
      await this.prisma.priceList.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.priceList.create({
      data: {
        ...plData,
        organizationId: orgId,
        items: items && items.length > 0 ? {
          create: items.map((i) => ({
            organizationId: orgId,
            productId: i.productId,
            productVariantId: i.productVariantId,
            categoryId: i.categoryId,
            minQuantity: i.minQuantity || 1,
            pricingType: i.pricingType || PricingType.FIXED,
            fixedPrice: i.fixedPrice,
            discountPercent: i.discountPercent,
            formula: i.formula,
            startDate: i.startDate ? new Date(i.startDate) : undefined,
            endDate: i.endDate ? new Date(i.endDate) : undefined,
          })),
        } : undefined,
      },
      include: { items: true },
    });
  }

  async update(orgId: string, id: string, dto: UpdatePriceListDto) {
    await this.findOne(orgId, id);

    if (dto.isDefault) {
      await this.prisma.priceList.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.priceList.update({
      where: { id },
      data: dto,
      include: { items: true },
    });
  }

  async addItem(orgId: string, pricelistId: string, dto: CreatePriceListItemDto) {
    await this.findOne(orgId, pricelistId);

    return this.prisma.priceListItem.create({
      data: {
        ...dto,
        organizationId: orgId,
        priceListId: pricelistId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async removeItem(orgId: string, pricelistId: string, itemId: string) {
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId: pricelistId, organizationId: orgId },
    });
    if (!item) throw new NotFoundException('Pricelist item not found');

    await this.prisma.priceListItem.delete({ where: { id: itemId } });
    return { message: 'Item removed from pricelist' };
  }

  /**
   * Real server-side multi-tier pricing evaluation engine.
   */
  async calculatePrice(orgId: string, dto: CalculatePriceDto) {
    const { productId, productVariantId, pricelistId, quantity = 1 } = dto;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId: orgId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    let basePrice = Number(product.price || 0);

    if (productVariantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: productVariantId, productId, organizationId: orgId },
      });
      if (variant) {
        basePrice += Number(variant.priceAdjustment || 0);
      }
    }

    let targetPricelistId = pricelistId;
    if (!targetPricelistId) {
      const defaultPl = await this.prisma.priceList.findFirst({
        where: { organizationId: orgId, isDefault: true, isActive: true },
      });
      targetPricelistId = defaultPl?.id;
    }

    let finalPrice = basePrice;
    let discountPercent = 0;
    let ruleApplied = 'BASE_PRODUCT_PRICE';

    if (targetPricelistId) {
      const now = new Date();
      // Fetch all eligible rules for this pricelist
      const rules = await this.prisma.priceListItem.findMany({
        where: {
          priceListId: targetPricelistId,
          organizationId: orgId,
          minQuantity: { lte: quantity },
          OR: [
            { productVariantId: productVariantId || undefined },
            { productId },
            { categoryId: product.categoryId || undefined },
            { productId: null, productVariantId: null, categoryId: null },
          ],
        },
        orderBy: [{ minQuantity: 'desc' }],
      });

      // Filter by date validity
      const validRules = rules.filter((r) => {
        if (r.startDate && r.startDate > now) return false;
        if (r.endDate && r.endDate < now) return false;
        return true;
      });

      // Prioritize: Variant Match > Product Match > Category Match > Global Match
      const matchedRule =
        validRules.find((r) => r.productVariantId && r.productVariantId === productVariantId) ||
        validRules.find((r) => r.productId && r.productId === productId) ||
        validRules.find((r) => r.categoryId && r.categoryId === product.categoryId) ||
        validRules.find((r) => !r.productId && !r.productVariantId && !r.categoryId);

      if (matchedRule) {
        if (matchedRule.pricingType === PricingType.FIXED && matchedRule.fixedPrice !== null) {
          finalPrice = Number(matchedRule.fixedPrice);
          ruleApplied = `FIXED_PRICE (${matchedRule.fixedPrice})`;
        } else if (matchedRule.pricingType === PricingType.PERCENTAGE_DISCOUNT && matchedRule.discountPercent !== null) {
          discountPercent = Number(matchedRule.discountPercent);
          finalPrice = basePrice * (1 - discountPercent / 100);
          ruleApplied = `DISCOUNT (${discountPercent}%)`;
        }
      }
    }

    const taxRate = Number(product.taxRate || 0);
    const subtotal = finalPrice * quantity;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    return {
      productId,
      productVariantId,
      productName: product.name,
      basePrice,
      unitPrice: finalPrice,
      quantity,
      discountPercent,
      taxRate,
      subtotal,
      taxAmount,
      total,
      ruleApplied,
    };
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.priceList.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Pricelist deactivated' };
  }
}
