import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrderStatus, VendorBillStatus, PickingType, PickingStatus } from '@prisma/client';

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  // ─── Vendors ──────────────────────────────────────────────────────────────
  async getVendors(orgId: string, query: { search?: string; page?: number; pageSize?: number } = {}) {
    const { search, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { name: 'asc' },
        include: { _count: { select: { purchaseOrders: true, vendorBills: true } } },
      }),
      this.prisma.vendor.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getVendor(orgId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId: orgId },
      include: {
        purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } },
        vendorBills: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async createVendor(orgId: string, dto: any) {
    return this.prisma.vendor.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateVendor(orgId: string, id: string, dto: any) {
    await this.getVendor(orgId, id);
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  async getPurchaseOrders(orgId: string, query: { status?: PurchaseOrderStatus; page?: number; pageSize?: number } = {}) {
    const { status, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { id: true, name: true, company: true } }, items: true },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getPurchaseOrder(orgId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        vendor: true,
        items: { include: { product: true } },
        bills: true,
        pickings: { include: { items: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async createPurchaseOrder(orgId: string, dto: {
    vendorId: string;
    expectedDate?: string;
    notes?: string;
    currency?: string;
    items: Array<{ productId?: string; name: string; quantity: number; unitPrice: number; taxRate?: number }>;
  }) {
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId: orgId } });
    const poNumber = `PO-${String(count + 1).padStart(5, '0')}`;

    const items = dto.items || [];
    const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const taxAmount = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice) * (Number(i.taxRate) || 0)) / 100, 0);
    const total = subtotal + taxAmount;

    return this.prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        vendorId: dto.vendorId,
        poNumber,
        status: PurchaseOrderStatus.DRAFT,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        currency: dto.currency || 'INR',
        subtotal,
        taxAmount,
        total,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            total: Number(i.quantity) * Number(i.unitPrice),
          })),
        },
      },
      include: { vendor: true, items: true },
    });
  }

  async confirmPurchaseOrder(orgId: string, id: string) {
    const po = await this.getPurchaseOrder(orgId, id);
    if (po.status === PurchaseOrderStatus.CANCELLED) throw new BadRequestException('Cannot confirm a cancelled PO');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update PO status
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.CONFIRMED },
      });

      // 2. Create Inward Stock Picking (Receipt) automatically
      const pickingCount = await tx.stockPicking.count({ where: { organizationId: orgId } });
      const pickingName = `WH/IN/${String(pickingCount + 1).padStart(5, '0')}`;

      await tx.stockPicking.create({
        data: {
          organizationId: orgId,
          purchaseOrderId: id,
          name: pickingName,
          pickingType: PickingType.INCOMING,
          status: PickingStatus.READY,
          notes: `Inward receipt from ${po.vendor.name} for ${po.poNumber}`,
          items: {
            create: po.items.filter((i) => i.productId).map((i) => ({
              productId: i.productId!,
              quantityDemand: i.quantity,
              quantityDone: 0,
            })),
          },
        },
      });

      return updatedPo;
    });
  }

  async receiveStock(orgId: string, id: string) {
    const po = await this.getPurchaseOrder(orgId, id);

    return this.prisma.$transaction(async (tx) => {
      // Increase product stock levels
      for (const item of po.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: orgId,
              productId: item.productId,
              type: 'PURCHASE',
              quantity: item.quantity,
              previousStock: item.product?.stock || 0,
              newStock: (item.product?.stock || 0) + item.quantity,
              referenceId: po.id,
              referenceType: 'purchase_order',
              notes: `Stock received for ${po.poNumber}`,
            },
          });
        }
      }

      // Update PO items received count & PO status
      await tx.purchaseOrderItem.updateMany({
        where: { purchaseOrderId: id },
        data: { receivedQuantity: 1 }, // mark received
      });

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.RECEIVED },
        include: { items: true, vendor: true },
      });
    });
  }

  // ─── Vendor Bills ─────────────────────────────────────────────────────────
  async createVendorBill(orgId: string, dto: {
    vendorId: string;
    purchaseOrderId?: string;
    billDate?: string;
    dueDate?: string;
    total: number;
    currency?: string;
    notes?: string;
  }) {
    const count = await this.prisma.vendorBill.count({ where: { organizationId: orgId } });
    const billNumber = `BILL-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.create({
        data: {
          organizationId: orgId,
          vendorId: dto.vendorId,
          purchaseOrderId: dto.purchaseOrderId,
          billNumber,
          status: VendorBillStatus.POSTED,
          billDate: dto.billDate ? new Date(dto.billDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          total: dto.total,
          currency: dto.currency || 'INR',
          notes: dto.notes,
        },
        include: { vendor: true },
      });

      if (dto.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: PurchaseOrderStatus.BILLED },
        });
      }

      return bill;
    });
  }

  async getVendorBills(orgId: string, query: { status?: VendorBillStatus; page?: number; pageSize?: number } = {}) {
    const { status, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.vendorBill.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { billDate: 'desc' },
        include: { vendor: true, purchaseOrder: true },
      }),
      this.prisma.vendorBill.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }
}
