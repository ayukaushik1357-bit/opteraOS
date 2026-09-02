import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrderStatus, InventoryMovementType } from '@prisma/client';

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  private async nextPONumber(orgId: string): Promise<string> {
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId: orgId } });
    return `PO-${String(count + 1).padStart(5, '0')}`;
  }

  // ── Vendors ───────────────────────────────────────────────────────────────
  async getVendors(orgId: string, query: any = {}) {
    const { search, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async createVendor(orgId: string, dto: any) {
    return this.prisma.vendor.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address || null,
        city: dto.city || null,
        country: dto.country || 'IN',
        gstin: dto.gstin || null,
        paymentTerms: dto.paymentTerms || 'Net 30',
      },
    });
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────
  async getPurchaseOrders(orgId: string, query: any = {}) {
    const { status, vendorId, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };

    if (status && status !== 'ALL') where.status = status as PurchaseOrderStatus;
    if (vendorId) where.vendorId = vendorId;

    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { vendor: true, items: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async findOnePO(orgId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId: orgId },
      include: { vendor: true, items: { include: { product: true } }, bills: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    return po;
  }

  async createPurchaseOrder(orgId: string, dto: any) {
    const poNumber = await this.nextPONumber(orgId);
    const items: any[] = dto.items ?? [];

    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitCost) || 0), 0);
    const taxAmount = items.reduce((sum, item) => {
      const lineSub = (Number(item.quantity) || 1) * (Number(item.unitCost) || 0);
      return sum + (lineSub * (Number(item.taxRate) || 0)) / 100;
    }, 0);
    const total = subtotal + taxAmount;

    return this.prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        vendorId: dto.vendorId,
        poNumber,
        status: PurchaseOrderStatus.DRAFT,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        subtotal,
        taxAmount,
        total,
        notes: dto.notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId || null,
            name: item.name || 'Purchased Item',
            quantity: Number(item.quantity) || 1,
            unitCost: Number(item.unitCost) || 0,
            taxRate: Number(item.taxRate) || 0,
            total: (Number(item.quantity) || 1) * (Number(item.unitCost) || 0) * (1 + (Number(item.taxRate) || 0) / 100),
          })),
        },
      },
      include: { vendor: true, items: true },
    });
  }

  async receivePurchaseOrder(orgId: string, id: string) {
    const po = await this.findOnePO(orgId, id);
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Purchase Order has already been received.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Inward inventory impact: increment stock for each line item that references a product
      for (const item of po.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const newStock = product.stock + item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });

            await tx.inventoryMovement.create({
              data: {
                organizationId: orgId,
                productId: item.productId,
                type: InventoryMovementType.PURCHASE,
                quantity: item.quantity,
                previousStock: product.stock,
                newStock,
                referenceId: po.id,
                referenceType: 'PURCHASE_ORDER',
                notes: `Received from PO ${po.poNumber}`,
              },
            });
          }
        }
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.RECEIVED },
        include: { vendor: true, items: true },
      });
    });
  }

  // ── Vendor Bills ──────────────────────────────────────────────────────────
  async getBills(orgId: string) {
    return this.prisma.vendorBill.findMany({
      where: { organizationId: orgId },
      include: { vendor: true, purchaseOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBill(orgId: string, dto: any) {
    return this.prisma.vendorBill.create({
      data: {
        organizationId: orgId,
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId || null,
        billNumber: dto.billNumber || `BILL-${Date.now().toString().slice(-6)}`,
        amount: Number(dto.amount),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 30 * 86400000),
        status: 'PENDING',
      },
      include: { vendor: true },
    });
  }
}
