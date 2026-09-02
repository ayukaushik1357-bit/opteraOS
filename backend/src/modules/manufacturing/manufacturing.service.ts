import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ManufacturingOrderStatus, WorkOrderStatus, QualityCheckStatus } from '@prisma/client';

@Injectable()
export class ManufacturingService {
  constructor(private prisma: PrismaService) {}

  // ─── Bills of Materials (BOM) ─────────────────────────────────────────────
  async getBOMs(orgId: string) {
    return this.prisma.billOfMaterial.findMany({
      where: { organizationId: orgId },
      include: {
        product: { select: { id: true, name: true, sku: true, stock: true } },
        components: { include: { product: { select: { id: true, name: true, sku: true, stock: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBOM(orgId: string, id: string) {
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id, organizationId: orgId },
      include: {
        product: true,
        components: { include: { product: true } },
        moOrders: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!bom) throw new NotFoundException('Bill of Material not found');
    return bom;
  }

  async createBOM(orgId: string, dto: {
    productId: string;
    code: string;
    quantity?: number;
    routingNotes?: string;
    components: Array<{ productId: string; quantity: number; unit?: string; notes?: string }>;
  }) {
    return this.prisma.billOfMaterial.create({
      data: {
        organizationId: orgId,
        productId: dto.productId,
        code: dto.code,
        quantity: dto.quantity || 1,
        routingNotes: dto.routingNotes,
        components: {
          create: dto.components.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            unit: c.unit || 'pcs',
            notes: c.notes,
          })),
        },
      },
      include: { product: true, components: { include: { product: true } } },
    });
  }

  // ─── Manufacturing Orders (MO) ────────────────────────────────────────────
  async getManufacturingOrders(orgId: string, query: { status?: ManufacturingOrderStatus; page?: number; pageSize?: number } = {}) {
    const { status, page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.manufacturingOrder.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          bom: true,
          workOrders: true,
        },
      }),
      this.prisma.manufacturingOrder.count({ where }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getManufacturingOrder(orgId: string, id: string) {
    const mo = await this.prisma.manufacturingOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        product: true,
        bom: { include: { components: { include: { product: true } } } },
        workOrders: true,
      },
    });
    if (!mo) throw new NotFoundException('Manufacturing order not found');
    return mo;
  }

  async createManufacturingOrder(orgId: string, dto: {
    productId: string;
    bomId?: string;
    quantity: number;
    startDate?: string;
    notes?: string;
    operations?: Array<{ operationName: string; plannedHours: number }>;
  }) {
    const count = await this.prisma.manufacturingOrder.count({ where: { organizationId: orgId } });
    const moNumber = `MO-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.manufacturingOrder.create({
      data: {
        organizationId: orgId,
        productId: dto.productId,
        bomId: dto.bomId,
        moNumber,
        quantity: dto.quantity,
        status: ManufacturingOrderStatus.CONFIRMED,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        notes: dto.notes,
        workOrders: {
          create: (dto.operations || [{ operationName: 'Assembly & Production', plannedHours: 4 }]).map((op) => ({
            operationName: op.operationName,
            plannedHours: op.plannedHours,
            status: WorkOrderStatus.PENDING,
          })),
        },
      },
      include: { product: true, bom: true, workOrders: true },
    });
  }

  async completeManufacturingOrder(orgId: string, id: string) {
    const mo = await this.getManufacturingOrder(orgId, id);
    if (mo.status === ManufacturingOrderStatus.COMPLETED) return mo;

    return this.prisma.$transaction(async (tx) => {
      // 1. Consume BOM components from inventory
      if (mo.bom?.components) {
        for (const comp of mo.bom.components) {
          const requiredQty = Number(comp.quantity) * mo.quantity;
          await tx.product.update({
            where: { id: comp.productId },
            data: { stock: { decrement: Math.ceil(requiredQty) } },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: orgId,
              productId: comp.productId,
              type: 'ADJUSTMENT',
              quantity: -Math.ceil(requiredQty),
              previousStock: comp.product.stock,
              newStock: comp.product.stock - Math.ceil(requiredQty),
              referenceId: mo.id,
              referenceType: 'manufacturing_order',
              notes: `Consumed for ${mo.moNumber}`,
            },
          });
        }
      }

      // 2. Increase finished product stock
      await tx.product.update({
        where: { id: mo.productId },
        data: { stock: { increment: mo.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          organizationId: orgId,
          productId: mo.productId,
          type: 'ADJUSTMENT',
          quantity: mo.quantity,
          previousStock: mo.product.stock,
          newStock: mo.product.stock + mo.quantity,
          referenceId: mo.id,
          referenceType: 'manufacturing_order',
          notes: `Produced finished goods for ${mo.moNumber}`,
        },
      });

      // 3. Mark all work orders and MO as completed
      await tx.workOrder.updateMany({
        where: { manufacturingOrderId: id },
        data: { status: WorkOrderStatus.COMPLETED, completedAt: new Date() },
      });

      return tx.manufacturingOrder.update({
        where: { id },
        data: { status: ManufacturingOrderStatus.COMPLETED, endDate: new Date() },
        include: { product: true, workOrders: true },
      });
    });
  }

  // ─── Equipment & Maintenance ──────────────────────────────────────────────
  async getEquipments(orgId: string) {
    return this.prisma.equipment.findMany({
      where: { organizationId: orgId },
      include: { requests: { take: 5, orderBy: { createdAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async createEquipment(orgId: string, dto: any) {
    return this.prisma.equipment.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async getMaintenanceRequests(orgId: string) {
    return this.prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId },
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaintenanceRequest(orgId: string, dto: any) {
    return this.prisma.maintenanceRequest.create({
      data: {
        ...dto,
        organizationId: orgId,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : new Date(),
      },
      include: { equipment: true },
    });
  }

  // ─── Quality Control ──────────────────────────────────────────────────────
  async getQualityChecks(orgId: string) {
    return this.prisma.qualityCheck.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQualityCheck(orgId: string, dto: any) {
    return this.prisma.qualityCheck.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async passQualityCheck(orgId: string, id: string, notes?: string) {
    return this.prisma.qualityCheck.update({
      where: { id },
      data: { status: QualityCheckStatus.PASSED, notes },
    });
  }
}
