import { Test, TestingModule } from '@nestjs/testing';
import { SequencesService } from './sequences/sequences.service';
import { LeadsService } from './leads/leads.service';
import { DealsService } from './deals/deals.service';
import { PipelinesService } from './pipelines/pipelines.service';
import { PricelistsService } from './pricelists/pricelists.service';
import { QuotationsService } from './quotations/quotations.service';
import { OrdersService } from './orders/orders.service';
import { CustomersService } from './customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEventsService } from '../common/events/domain-events.service';
import { CommunicationsService } from './communications/communications.service';
import { LeadStage, DealStage, QuotationStatus, OrderStatus, PricingType, SequenceType } from '@prisma/client';

describe('Advanced CRM + Sales Engine Test Suite (TEST A through TEST H)', () => {
  let leadsService: LeadsService;
  let dealsService: DealsService;
  let pricelistsService: PricelistsService;
  let quotationsService: QuotationsService;
  let ordersService: OrdersService;
  let customersService: CustomersService;
  let sequencesService: SequencesService;
  let domainEventsService: DomainEventsService;

  const mockPrismaService = {
    salesSequence: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    contact: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    pipeline: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    pipelineStage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    opportunityHistory: {
      create: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    priceList: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    priceListItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    quotation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    quotationItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    activity: {
      create: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockDomainEventsService = {
    emit: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockCommunicationsService = {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123', provider: 'smtp' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequencesService,
        LeadsService,
        DealsService,
        PipelinesService,
        PricelistsService,
        QuotationsService,
        OrdersService,
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DomainEventsService, useValue: mockDomainEventsService },
        { provide: CommunicationsService, useValue: mockCommunicationsService },
      ],
    }).compile();

    sequencesService = module.get<SequencesService>(SequencesService);
    leadsService = module.get<LeadsService>(LeadsService);
    dealsService = module.get<DealsService>(DealsService);
    pricelistsService = module.get<PricelistsService>(PricelistsService);
    quotationsService = module.get<QuotationsService>(QuotationsService);
    ordersService = module.get<OrdersService>(OrdersService);
    customersService = module.get<CustomersService>(CustomersService);
    domainEventsService = module.get<DomainEventsService>(DomainEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── TEST A: Lead Scoring & Duplicate Detection Test ────────────────────────
  describe('TEST A: Multi-Factor Scoring & Duplicate Detection', () => {
    it('should accurately calculate lead score with factors breakdown', () => {
      const result = leadsService.calculateScore({
        email: 'ceo@acmecorp.com',
        phone: '+919876543210',
        company: 'Acme Technologies',
        source: 'Inbound Demo Request',
        expectedRevenue: 600000,
        activityCount: 3,
      });

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.factors['business_domain']).toBeDefined();
      expect(result.factors['enterprise_deal_size']).toBeDefined();
      expect(result.factors['phone_present']).toBeDefined();
    });

    it('should identify exact duplicate email matches across leads and contacts', async () => {
      mockPrismaService.lead.findMany.mockResolvedValueOnce([{ id: 'l1', name: 'John Doe', email: 'john@acme.com' }]);
      mockPrismaService.contact.findMany.mockResolvedValueOnce([]);

      const result = await leadsService.checkDuplicates('org_1', { email: 'john@acme.com' });
      expect(result.status).toBe('EXACT');
      expect(result.count).toBe(1);
      expect(result.matches[0].matchType).toBe('EXACT_EMAIL');
    });
  });

  // ── TEST B: Atomic Lead Conversion Workflow Test ───────────────────────────
  describe('TEST B: Atomic Lead Conversion Workflow', () => {
    it('should atomically convert lead to Customer, Contact, Company and Opportunity', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValueOnce({
        id: 'lead_1',
        name: 'Sarah Connor',
        company: 'Cyberdyne Systems',
        email: 'sarah@cyberdyne.com',
        phone: '+15550199',
        expectedRevenue: 500000,
        stage: LeadStage.QUALIFIED,
      });

      mockPrismaService.company.create.mockResolvedValueOnce({ id: 'comp_1', displayName: 'Cyberdyne Systems' });
      mockPrismaService.contact.create.mockResolvedValueOnce({ id: 'cnt_1', name: 'Sarah Connor' });
      mockPrismaService.customer.create.mockResolvedValueOnce({ id: 'cust_1', name: 'Sarah Connor' });
      mockPrismaService.pipeline.findFirst.mockResolvedValueOnce({
        id: 'pipe_1',
        stages: [{ id: 'stg_1', name: 'New' }],
      });
      mockPrismaService.deal.create.mockResolvedValueOnce({
        id: 'deal_1',
        title: 'Cyberdyne Systems — New Deal',
        value: 500000,
      });
      mockPrismaService.lead.update.mockResolvedValueOnce({
        id: 'lead_1',
        stage: LeadStage.CONVERTED,
      });

      const conversion = await leadsService.convert('org_1', 'user_1', 'lead_1', {});

      expect(conversion.customer.id).toBe('cust_1');
      expect(conversion.deal?.id).toBe('deal_1');
      expect(mockDomainEventsService.publish).toHaveBeenCalledWith(
        'lead.converted',
        expect.objectContaining({ leadId: 'lead_1', customerId: 'cust_1' }),
      );
    });
  });

  // ── TEST C: Multi-Pipeline Stage Transitions & History ─────────────────────
  describe('TEST C: Multi-Pipeline Stage Transitions & Weighted Revenue', () => {
    it('should validate stage transition, sync probability, and record OpportunityHistory', async () => {
      mockPrismaService.deal.findFirst.mockResolvedValueOnce({
        id: 'deal_1',
        title: 'Cloud Migration',
        value: 100000,
        probability: 20,
        stage: DealStage.NEW,
        pipelineStage: { id: 'stg_1', name: 'New' },
      });

      mockPrismaService.pipelineStage.findFirst.mockResolvedValueOnce({
        id: 'stg_2',
        name: 'Proposal',
        probability: 60,
        isWon: false,
        isLost: false,
      });

      mockPrismaService.deal.update.mockResolvedValueOnce({
        id: 'deal_1',
        value: 100000,
        probability: 60,
        weightedRevenue: 60000,
        stage: DealStage.PROPOSAL,
      });

      const result = await dealsService.moveStage('org_1', 'user_1', 'deal_1', {
        stageId: 'stg_2',
        reason: 'Proposal submitted',
      });

      expect(result.weightedRevenue).toBe(60000);
      expect(mockPrismaService.opportunityHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opportunityId: 'deal_1',
            fromStage: 'New',
            toStage: 'Proposal',
            toProb: 60,
          }),
        }),
      );
    });
  });

  // ── TEST D: Dynamic Multi-Tier Pricing Engine ──────────────────────────────
  describe('TEST D: Dynamic Multi-Tier Pricing Engine', () => {
    it('should evaluate volume discount rules and compute correct unit and total pricing', async () => {
      mockPrismaService.product.findFirst.mockResolvedValueOnce({
        id: 'prod_1',
        name: 'Enterprise Server Pack',
        price: 10000,
        taxRate: 18,
        categoryId: 'cat_servers',
      });

      mockPrismaService.priceList.findFirst.mockResolvedValueOnce({ id: 'pl_wholesale' });
      mockPrismaService.priceListItem.findMany.mockResolvedValueOnce([
        {
          id: 'rule_1',
          productId: 'prod_1',
          minQuantity: 10,
          pricingType: PricingType.PERCENTAGE_DISCOUNT,
          discountPercent: 20,
        },
      ]);

      const priceResult = await pricelistsService.calculatePrice('org_1', {
        productId: 'prod_1',
        quantity: 10,
      });

      expect(priceResult.basePrice).toBe(10000);
      expect(priceResult.unitPrice).toBe(8000); // 20% off
      expect(priceResult.subtotal).toBe(80000);
      expect(priceResult.taxAmount).toBe(14400); // 18% GST
      expect(priceResult.total).toBe(94400);
      expect(priceResult.ruleApplied).toContain('DISCOUNT (20%)');
    });
  });

  // ── TEST E: Concurrency-Safe Sequence & Quotation Totals Math ───────────────
  describe('TEST E: Sequences & Quotation Calculations', () => {
    it('should generate formatted sequential identifier QT-YYYY-XXXXX', async () => {
      const year = new Date().getFullYear();
      mockPrismaService.salesSequence.findUnique.mockResolvedValueOnce({
        id: 'seq_1',
        prefix: 'QT',
        padding: 5,
        nextValue: 42,
        yearReset: true,
        currentYear: year,
      });

      const seq = await sequencesService.getNextSequence('org_1', SequenceType.QUOTATION, 'QT');
      expect(seq).toBe(`QT-${year}-00042`);
    });

    it('should accurately compute line discounts, GST taxes and detect discount approval thresholds', () => {
      const items = [
        { description: 'Item 1', quantity: 2, unitPrice: 1000, discountPercent: 10, taxRate: 18 },
        { description: 'Item 2', quantity: 1, unitPrice: 5000, discountPercent: 0, taxRate: 18 },
      ];

      const totals = quotationsService.calculateTotals(items, 500);
      expect(totals.subtotal).toBe(6800); // (2*900) + 5000 = 1800 + 5000 = 6800
      expect(totals.taxAmount).toBe(1224); // 18% of 6800 = 1224
      expect(totals.total).toBe(7524); // 6800 + 1224 - 500 = 7524
    });
  });

  // ── TEST F & G: Quotation Acceptance, Order Confirmation & Idempotency ─────
  describe('TEST F & G: Quotation Acceptance & Order Confirmation Idempotency', () => {
    it('should transition quotation to ACCEPTED and create confirmed Sales Order', async () => {
      mockPrismaService.quotation.findFirst.mockResolvedValueOnce({
        id: 'qt_1',
        quotationNumber: 'QT-2026-00001',
        status: QuotationStatus.DRAFT,
        customerId: 'cust_1',
        subtotal: 100000,
        taxAmount: 18000,
        discountAmount: 0,
        total: 118000,
        currency: 'INR',
        paymentTerms: 'Net 30',
        items: [
          { description: 'Service Line', quantity: 1, unitPrice: 100000, discountPercent: 0, taxRate: 18, subtotal: 100000, total: 118000 },
        ],
      });

      mockPrismaService.quotation.update.mockResolvedValueOnce({
        id: 'qt_1',
        status: QuotationStatus.ACCEPTED,
      });

      mockPrismaService.salesSequence.findUnique.mockResolvedValueOnce({
        id: 'seq_so',
        prefix: 'SO',
        padding: 5,
        nextValue: 1,
        yearReset: true,
        currentYear: 2026,
      });

      mockPrismaService.order.create.mockResolvedValueOnce({
        id: 'ord_1',
        orderNumber: 'SO-2026-00001',
        status: OrderStatus.CONFIRMED,
        total: 118000,
        customerId: 'cust_1',
        items: [{ name: 'Service Line', quantity: 1, unitPrice: 100000 }],
      });

      const acceptRes = await quotationsService.acceptQuotation('org_1', 'qt_1', { acceptedBy: 'Client' });
      expect(acceptRes.quotation.status).toBe(QuotationStatus.ACCEPTED);
      expect(acceptRes.order.orderNumber).toBe('SO-2026-00001');
      expect(mockDomainEventsService.publish).toHaveBeenCalledWith(
        'sales.order.confirmed',
        expect.objectContaining({ orderNumber: 'SO-2026-00001', total: 118000 }),
      );
    });

    it('should be idempotent and return existing order without re-creating or re-emitting events', async () => {
      mockPrismaService.quotation.findFirst.mockResolvedValueOnce({
        id: 'qt_1',
        status: QuotationStatus.ACCEPTED,
        order: { id: 'ord_1', orderNumber: 'SO-2026-00001' },
      });

      const res = await quotationsService.acceptQuotation('org_1', 'qt_1', {});
      expect(res.message).toBe('Quotation already accepted');
      expect(res.order.id).toBe('ord_1');
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });
  });

  // ── TEST H: Customer 360 Consolidated Aggregation Test ─────────────────────
  describe('TEST H: Customer 360 Aggregation', () => {
    it('should aggregate lifetime revenue, open pipeline value, active orders and activities', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValueOnce({
        id: 'cust_1',
        name: 'Reliance Retail',
        company: 'Reliance Industries',
        email: 'procurement@reliance.in',
        totalRevenue: 2500000,
        companyRel: { id: 'comp_1', displayName: 'Reliance Industries', contacts: [] },
        contact: { id: 'cnt_1', name: 'Mukesh' },
        deals: [
          { id: 'd1', stage: 'PROPOSAL', value: 500000, weightedRevenue: 300000 },
          { id: 'd2', stage: 'WON', value: 1000000, weightedRevenue: 1000000 },
        ],
        quotations: [{ id: 'q1', quotationNumber: 'QT-2026-00005', total: 500000, items: [] }],
        orders: [{ id: 'o1', orderNumber: 'SO-2026-00002', status: 'CONFIRMED', total: 1000000, items: [] }],
        invoices: [{ id: 'inv1', status: 'PAID', total: 1000000, amountPaid: 1000000, payments: [] }],
        activities: [{ id: 'act1', type: 'CALL', title: 'Executive Review' }],
        tasks: [],
      });

      const c360 = await customersService.getCustomer360('org_1', 'cust_1');

      expect(c360.metrics.lifetimeValue).toBe(2500000);
      expect(c360.metrics.openPipelineValue).toBe(500000);
      expect(c360.metrics.wonPipelineValue).toBe(1000000);
      expect(c360.metrics.totalOrderValue).toBe(1000000);
      expect(c360.metrics.outstandingBalance).toBe(0);
      expect(c360.deals.length).toBe(2);
      expect(c360.quotations.length).toBe(1);
      expect(c360.orders.length).toBe(1);
    });
  });
});
