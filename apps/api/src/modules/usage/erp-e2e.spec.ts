import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from '../contacts/contacts.service';
import { CompaniesService } from '../companies/companies.service';
import { QuotationsService } from '../quotations/quotations.service';
import { AccountingService } from '../accounting/accounting.service';
import { PurchaseService } from '../purchase/purchase.service';
import { ManufacturingService } from '../manufacturing/manufacturing.service';
import { HelpdeskService } from '../helpdesk/helpdesk.service';
import { PriceListsService } from '../pricelists/pricelists.service';
import { ProjectsService } from '../projects/projects.service';
import { HrService } from '../hr/hr.service';
import { DiscussService } from '../discuss/discuss.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AccountType, QuotationStatus, PurchaseOrderStatus, ManufacturingStatus, TicketStatus, TicketPriority } from '@prisma/client';

describe('OPTERAOS ERP Domain Modules E2E Integration Suite', () => {
  let contactsService: ContactsService;
  let companiesService: CompaniesService;
  let quotationsService: QuotationsService;
  let accountingService: AccountingService;
  let purchaseService: PurchaseService;
  let manufacturingService: ManufacturingService;
  let helpdeskService: HelpdeskService;
  let priceListsService: PriceListsService;
  let projectsService: ProjectsService;
  let hrService: HrService;
  let discussService: DiscussService;

  const mockOrgId = 'org-test-erp-001';

  const mockPrisma = {
    contact: {
      findMany: jest.fn().mockResolvedValue([{ id: 'c1', firstName: 'Alice', lastName: 'Smith', organizationId: mockOrgId }]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue({ id: 'c1', firstName: 'Alice', lastName: 'Smith', organizationId: mockOrgId }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'c1' }),
    },
    company: {
      findMany: jest.fn().mockResolvedValue([{ id: 'comp1', name: 'Acme Corp', organizationId: mockOrgId }]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue({ id: 'comp1', name: 'Acme Corp', organizationId: mockOrgId }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'comp1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'comp1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'comp1' }),
    },
    quotation: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        id: 'q1',
        quotationNumber: 'QT-00001',
        customerId: 'cust-1',
        status: QuotationStatus.DRAFT,
        items: [{ productId: 'p1', name: 'Item 1', quantity: 2, unitPrice: 100, taxRate: 18 }],
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'q1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'q1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'q1' }),
    },
    account: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'acc-1', code: '1000', name: 'Cash', type: AccountType.ASSET, balance: 50000 },
        { id: 'acc-2', code: '4000', name: 'Sales Revenue', type: AccountType.INCOME, balance: 50000 },
      ]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'acc-new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'acc-1', ...data })),
    },
    journalEntry: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'je-1', ...data })),
    },
    expense: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'exp-1', ...data })),
    },
    vendor: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'v1', ...data })),
    },
    purchaseOrder: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-00001',
        status: PurchaseOrderStatus.DRAFT,
        items: [{ productId: 'p1', quantity: 10 }],
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'po-1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'po-1', ...data })),
    },
    vendorBill: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'vb-1', ...data })),
    },
    billOfMaterials: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'bom-1', ...data })),
    },
    manufacturingOrder: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        id: 'mo-1',
        moNumber: 'MO-00001',
        productId: 'p-finished',
        quantity: 5,
        status: ManufacturingStatus.PLANNED,
        bom: { items: [{ productId: 'p-raw', quantity: 2 }] },
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mo-1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mo-1', ...data })),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p-raw', name: 'Raw Material', stock: 100, price: 50 }),
      findFirst: jest.fn().mockResolvedValue({ id: 'p-raw', name: 'Raw Material', stock: 100, price: 50 }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p-raw', ...data })),
    },
    inventoryMovement: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'im-1', ...data })),
    },
    ticket: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ id: 't1', ticketNumber: 'TICK-00001', status: TicketStatus.OPEN, priority: TicketPriority.HIGH }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 't1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 't1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 't1' }),
    },
    ticketComment: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tc-1', ...data })),
    },
    priceList: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        id: 'pl-1',
        name: 'Wholesale',
        isDefault: true,
        rules: [{ productId: 'p-raw', minQuantity: 5, discountPercent: 10, fixedPrice: null }],
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pl-1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'pl-1' }),
    },
    priceRule: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pr-1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'pr-1' }),
    },
    project: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'ERP Implementation' }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'proj-1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'proj-1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'proj-1' }),
    },
    projectTask: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pt-1', ...data })),
    },
    timeEntry: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'te-1', ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    employee: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue({ id: 'emp-1', firstName: 'Vikram', lastName: 'Rao', email: 'vikram@optera.io' }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'emp-1', ...data })),
    },
    leaveRequest: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lr-1', ...data })),
      findFirst: jest.fn().mockResolvedValue({ id: 'lr-1' }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lr-1', ...data })),
    },
    attendance: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'att-1', ...create })),
    },
    channel: {
      findMany: jest.fn().mockResolvedValue([{ id: 'ch-1', name: 'general' }]),
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ch-new', ...data })),
      findFirst: jest.fn().mockResolvedValue({ id: 'ch-1', name: 'general' }),
    },
    channelMessage: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'msg-1', ...data })),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
  };

  const mockOrdersService = {
    create: jest.fn().mockResolvedValue({ id: 'ord-new', orderNumber: 'SO-00001' }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        CompaniesService,
        QuotationsService,
        AccountingService,
        PurchaseService,
        ManufacturingService,
        HelpdeskService,
        PriceListsService,
        ProjectsService,
        HrService,
        DiscussService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    contactsService = module.get<ContactsService>(ContactsService);
    companiesService = module.get<CompaniesService>(CompaniesService);
    quotationsService = module.get<QuotationsService>(QuotationsService);
    accountingService = module.get<AccountingService>(AccountingService);
    purchaseService = module.get<PurchaseService>(PurchaseService);
    manufacturingService = module.get<ManufacturingService>(ManufacturingService);
    helpdeskService = module.get<HelpdeskService>(HelpdeskService);
    priceListsService = module.get<PriceListsService>(PriceListsService);
    projectsService = module.get<ProjectsService>(ProjectsService);
    hrService = module.get<HrService>(HrService);
    discussService = module.get<DiscussService>(DiscussService);
  });

  it('1. Contacts: should create and search contacts with tenant isolation', async () => {
    const created = await contactsService.create(mockOrgId, {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@acme.com',
      phone: '+91 9876543210',
    });
    expect(created.firstName).toBe('Alice');
    expect(created.organizationId).toBe(mockOrgId);

    const list = await contactsService.findAll(mockOrgId, { search: 'Alice' });
    expect(list.total).toBe(1);
  });

  it('2. Companies: should create company records', async () => {
    const company = await companiesService.create(mockOrgId, {
      name: 'Acme Technologies Pvt Ltd',
      industry: 'Software',
      city: 'Bangalore',
    });
    expect(company.name).toBe('Acme Technologies Pvt Ltd');
  });

  it('3. Quotations: should calculate server-side totals and convert to sales order', async () => {
    const quote = await quotationsService.create(mockOrgId, {
      customerId: 'cust-1',
      items: [
        { name: 'Cloud License', quantity: 2, unitPrice: 1000, taxRate: 18 },
      ],
      discountAmount: 100,
    });
    expect(quote.quotationNumber).toBe('QT-00001');
    expect(quote.subtotal).toBe(2000);
    expect(quote.taxAmount).toBe(360);
    expect(quote.total).toBe(2260); // 2000 + 360 - 100

    const converted = await quotationsService.convertToSalesOrder(mockOrgId, quote.id);
    expect(converted.success).toBe(true);
    expect(mockOrdersService.create).toHaveBeenCalled();
  });

  it('4. Accounting: should enforce Balanced Ledger rule (Debit = Credit)', async () => {
    // Unbalanced entry must fail
    await expect(
      accountingService.createJournalEntry(mockOrgId, {
        description: 'Unbalanced entry',
        lines: [
          { accountId: 'acc-1', debit: 1000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 800 },
        ],
      }),
    ).rejects.toThrow(/Unbalanced Journal Entry/);

    // Balanced entry must succeed
    const balanced = await accountingService.createJournalEntry(mockOrgId, {
      description: 'Balanced entry',
      lines: [
        { accountId: 'acc-1', debit: 1000, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 1000 },
      ],
    });
    expect(balanced.totalDebit).toBe(1000);
    expect(balanced.totalCredit).toBe(1000);
  });

  it('5. Purchasing: should create PO and update inventory on receipt', async () => {
    const po = await purchaseService.createPurchaseOrder(mockOrgId, {
      vendorId: 'v1',
      items: [{ productId: 'p-raw', name: 'Raw Material', quantity: 10, unitCost: 50, taxRate: 18 }],
    });
    expect(po.poNumber).toBe('PO-00001');
    expect(po.total).toBe(590);

    const received = await purchaseService.receivePurchaseOrder(mockOrgId, po.id);
    expect(received.status).toBe(PurchaseOrderStatus.RECEIVED);
    expect(mockPrisma.product.update).toHaveBeenCalled();
    expect(mockPrisma.inventoryMovement.create).toHaveBeenCalled();
  });

  it('6. Manufacturing: should create MO, consume raw materials and output finished goods', async () => {
    const mo = await manufacturingService.createOrder(mockOrgId, {
      bomId: 'bom-1',
      productId: 'p-finished',
      quantity: 5,
    });
    expect(mo.moNumber).toBe('MO-00001');

    const completed = await manufacturingService.completeOrder(mockOrgId, mo.id);
    expect(completed.status).toBe(ManufacturingStatus.COMPLETED);
    expect(mockPrisma.inventoryMovement.create).toHaveBeenCalled();
  });

  it('7. Helpdesk: should create ticket, add comments, and track priority', async () => {
    const ticket = await helpdeskService.create(mockOrgId, {
      subject: 'Unable to connect API',
      priority: 'HIGH',
      description: 'Getting HTTP 403 on endpoint',
    });
    expect(ticket.ticketNumber).toBe('TICK-00001');
    expect(ticket.priority).toBe(TicketPriority.HIGH);

    const comment = await helpdeskService.addComment(mockOrgId, ticket.id, {
      content: 'Investigating API token scopes.',
      authorName: 'Support Agent 1',
    });
    expect(comment.content).toBe('Investigating API token scopes.');
  });

  it('8. Price Lists: should resolve volume discount tiers server-side', async () => {
    const resolution = await priceListsService.resolvePrice(mockOrgId, 'p-raw', 10);
    expect(resolution.originalPrice).toBe(50);
    expect(resolution.unitPrice).toBe(45); // 10% off 50
    expect(resolution.discount).toBe(5);
  });

  it('9. Projects: should create project, add tasks, and log timesheets', async () => {
    const project = await projectsService.create(mockOrgId, {
      name: 'opteraOS Cloud Deployment',
      budget: 500000,
    });
    expect(project.name).toBe('opteraOS Cloud Deployment');

    const entry = await projectsService.logTime(mockOrgId, project.id, {
      hours: 4.5,
      description: 'Setup Redis cluster and Docker containers',
    });
    expect(entry.hours).toBe(4.5);
  });

  it('10. HR: should record employee, attendance, and leave requests', async () => {
    const emp = await hrService.createEmployee(mockOrgId, {
      firstName: 'Vikram',
      lastName: 'Rao',
      email: 'vikram@optera.io',
      department: 'Engineering',
      jobTitle: 'Senior Platform Architect',
    });
    expect(emp.firstName).toBe('Vikram');

    const leave = await hrService.createLeaveRequest(mockOrgId, {
      employeeId: emp.id,
      startDate: new Date(),
      endDate: new Date(),
      daysCount: 1,
      reason: 'Personal leave',
    });
    expect(leave.daysCount).toBe(1);
  });

  it('11. Discuss: should seed channels and dispatch messages', async () => {
    const channels = await discussService.getChannels(mockOrgId);
    expect(channels.length).toBeGreaterThanOrEqual(1);

    const msg = await discussService.sendMessage(mockOrgId, channels[0].id, 'user-1', 'Admin', 'Hello team!');
    expect(msg.content).toBe('Hello team!');
  });
});
