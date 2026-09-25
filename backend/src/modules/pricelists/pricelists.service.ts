import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PriceListsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.priceList.findMany({
      where: { organizationId: orgId },
      include: { rules: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const pl = await this.prisma.priceList.findFirst({
      where: { id, organizationId: orgId },
      include: { rules: { include: { product: true } } },
    });
    if (!pl) throw new NotFoundException('Price list not found');
    return pl;
  }

  async create(orgId: string, dto: any) {
    return this.prisma.priceList.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        currency: dto.currency || 'INR',
        isDefault: Boolean(dto.isDefault),
      },
      include: { rules: true },
    });
  }

  async addRule(orgId: string, priceListId: string, dto: any) {
    await this.findOne(orgId, priceListId);
    return this.prisma.priceRule.create({
      data: {
        priceListId,
        productId: dto.productId || null,
        minQuantity: Number(dto.minQuantity) || 1,
        discountPercent: dto.discountPercent !== undefined ? Number(dto.discountPercent) : null,
        fixedPrice: dto.fixedPrice !== undefined ? Number(dto.fixedPrice) : null,
      },
      include: { product: true },
    });
  }

  async removeRule(orgId: string, priceListId: string, ruleId: string) {
    await this.findOne(orgId, priceListId);
    await this.prisma.priceRule.delete({ where: { id: ruleId } });
    return { success: true, message: 'Rule removed successfully' };
  }

  // Server-side price resolution engine
  async resolvePrice(orgId: string, productId: string, quantity: number, customerId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId: orgId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const basePrice = Number(product.price);
    const defaultList = await this.prisma.priceList.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: {
        rules: {
          where: {
            OR: [{ productId }, { productId: null }],
            minQuantity: { lte: quantity },
          },
          orderBy: { minQuantity: 'desc' },
        },
      },
    });

    if (defaultList && defaultList.rules.length > 0) {
      const bestRule = defaultList.rules[0];
      if (bestRule.fixedPrice !== null) {
        return { unitPrice: Number(bestRule.fixedPrice), originalPrice: basePrice, discount: basePrice - Number(bestRule.fixedPrice) };
      }
      if (bestRule.discountPercent !== null) {
        const discount = (basePrice * Number(bestRule.discountPercent)) / 100;
        return { unitPrice: basePrice - discount, originalPrice: basePrice, discount };
      }
    }

    return { unitPrice: basePrice, originalPrice: basePrice, discount: 0 };
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.priceList.delete({ where: { id } });
    return { success: true, message: 'Price list deleted successfully' };
  }
}
