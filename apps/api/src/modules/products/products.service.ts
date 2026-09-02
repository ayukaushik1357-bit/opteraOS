import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, categoryId, lowStock, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (categoryId) where.categoryId = categoryId;
    if (lowStock === 'true') where.stock = { lte: this.prisma.product.fields.minStock };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { category: true } }),
      this.prisma.product.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getLowStockAlerts(orgId: string) {
    return this.prisma.$queryRaw`
      SELECT id, name, sku, stock, "minStock", supplier
      FROM products
      WHERE "organizationId" = ${orgId}
        AND stock <= "minStock"
        AND "isActive" = true
      ORDER BY (stock - "minStock") ASC
    `;
  }

  async findOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: { category: true, inventoryMovements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(orgId: string, dto: any) {
    return this.prisma.product.create({ data: { ...dto, organizationId: orgId } });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.findOne(orgId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
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
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  async getCategories(orgId: string) {
    return this.prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } });
  }

  async createCategory(orgId: string, dto: any) {
    return this.prisma.category.create({ data: { ...dto, organizationId: orgId } });
  }
}
