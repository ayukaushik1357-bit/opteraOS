import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ManufacturingStatus, InventoryMovementType } from '@prisma/client';

@Injectable()
export class ManufacturingService {
  constructor(private prisma: PrismaService) {}

  private async nextMONumber(orgId: string): Promise<string> {
    const count = await this.prisma.manufacturingOrder.count({ where: { organizationId: orgId } });
    return `MO-${String(count + 1).padStart(5, '0')}`;
  }

  // ── Bills of Materials (BOM) ──────────────────────────────────────────────
  async getBOMs(orgId: string) {
    return this.prisma.billOfMaterials.findMany({
      where: { organizationId: orgId },
      include: { product: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBOM(orgId: string, dto: any) {
    const items: any[] = dto.items ?? [];
    return this.prisma.billOfMaterials.create({
      data: {
        organizationId: orgId,
        productId: dto.productId,
        name: dto.name,
        version: dto.version || 'v1.0',
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'pcs',
          })),
        },
      },
      include: { product: true, items: true },
    });
  }

  // ── Manufacturing Orders (MO) ─────────────────────────────────────────────
  async getOrders(orgId: string) {
    return this.prisma.manufacturingOrder.findMany({
      where: { organizationId: orgId },
      include: { product: true, bom: { include: { items: { include: { product: true } } } }, workOrders: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrder(orgId: string, dto: any) {
    const moNumber = await this.nextMONumber(orgId);
    return this.prisma.manufacturingOrder.create({
      data: {
        organizationId: orgId,
        bomId: dto.bomId,
        productId: dto.productId,
        moNumber,
        quantity: Number(dto.quantity) || 1,
        status: ManufacturingStatus.PLANNED,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        workOrders: {
          create: [
            { operationName: 'Assembly & Component Preparation', sequence: 1, durationMinutes: 60, status: 'PENDING' },
            { operationName: 'Main Production & Wiring', sequence: 2, durationMinutes: 120, status: 'PENDING' },
            { operationName: 'Quality Inspection & Packaging', sequence: 3, durationMinutes: 30, status: 'PENDING' },
          ],
        },
      },
      include: { product: true, bom: true, workOrders: true },
    });
  }

  async completeOrder(orgId: string, id: string) {
    const mo = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId: orgId },
      include: { bom: { include: { items: true } }, product: true },
    });
    if (!mo) throw new NotFoundException('Manufacturing order not found');
    if (mo.status === ManufacturingStatus.COMPLETED) {
      throw new BadRequestException('Order is already completed');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Consume raw materials based on BOM quantities
      for (const item of mo.bom.items) {
        const requiredQty = Math.ceil(Number(item.quantity) * mo.quantity);
        const rawProduct = await tx.product.findUnique({ where: { id: item.productId } });
        if (rawProduct) {
          const newRawStock = Math.max(0, rawProduct.stock - requiredQty);
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newRawStock },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: orgId,
              productId: item.productId,
              type: InventoryMovementType.ADJUSTMENT,
              quantity: -requiredQty,
              previousStock: rawProduct.stock,
              newStock: newRawStock,
              referenceId: mo.id,
              referenceType: 'MANUFACTURING_CONSUMPTION',
              notes: `Consumed for MO ${mo.moNumber}`,
            },
          });
        }
      }

      // 2. Increase finished good stock
      const finishedProduct = await tx.product.findUnique({ where: { id: mo.productId } });
      if (finishedProduct) {
        const newFinishedStock = finishedProduct.stock + mo.quantity;
        await tx.product.update({
          where: { id: mo.productId },
          data: { stock: newFinishedStock },
        });

        await tx.inventoryMovement.create({
          data: {
            organizationId: orgId,
            productId: mo.productId,
            type: InventoryMovementType.PURCHASE,
            quantity: mo.quantity,
            previousStock: finishedProduct.stock,
            newStock: newFinishedStock,
            referenceId: mo.id,
            referenceType: 'MANUFACTURING_OUTPUT',
            notes: `Produced from MO ${mo.moNumber}`,
          },
        });
      }

      return tx.manufacturingOrder.update({
        where: { id },
        data: { status: ManufacturingStatus.COMPLETED, completedDate: new Date() },
        include: { product: true, workOrders: true },
      });
    });
  }
}
