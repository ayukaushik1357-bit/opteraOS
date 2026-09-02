import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] =
    'postgresql://opteraos:opteraos_dev_pass@localhost:5432/opteraos_db?schema=public';
}

const prisma = new PrismaClient();

function hashPassword(plain: string): string {
  try {
    return hashSync(plain, 10);
  } catch {
    return '$2a$10$5M3dZ.8g1K2fL9y4z3uBveK7u7a1pXfB9e9H7e8Y7e8Y7e8Y7e8Y7';
  }
}

// Enums definition
const UserRole = {
  OWNER: 'OWNER' as const,
  ADMIN: 'ADMIN' as const,
  MANAGER: 'MANAGER' as const,
  EMPLOYEE: 'EMPLOYEE' as const,
  VIEWER: 'VIEWER' as const,
};

const CustomerStatus = {
  ACTIVE: 'ACTIVE' as const,
  PROSPECT: 'PROSPECT' as const,
  INACTIVE: 'INACTIVE' as const,
  CHURNED: 'CHURNED' as const,
};

const LeadStage = {
  NEW: 'NEW' as const,
  CONTACTED: 'CONTACTED' as const,
  QUALIFIED: 'QUALIFIED' as const,
  UNQUALIFIED: 'UNQUALIFIED' as const,
  CONVERTED: 'CONVERTED' as const,
  LOST: 'LOST' as const,
};

const DealStage = {
  NEW: 'NEW' as const,
  QUALIFIED: 'QUALIFIED' as const,
  PROPOSAL: 'PROPOSAL' as const,
  NEGOTIATION: 'NEGOTIATION' as const,
  WON: 'WON' as const,
  LOST: 'LOST' as const,
};

const TaskPriority = {
  LOW: 'LOW' as const,
  MEDIUM: 'MEDIUM' as const,
  HIGH: 'HIGH' as const,
  URGENT: 'URGENT' as const,
};

const TaskStatus = {
  TODO: 'TODO' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

const InvoiceStatus = {
  DRAFT: 'DRAFT' as const,
  SENT: 'SENT' as const,
  PARTIALLY_PAID: 'PARTIALLY_PAID' as const,
  PAID: 'PAID' as const,
  OVERDUE: 'OVERDUE' as const,
  CANCELLED: 'CANCELLED' as const,
};

async function main() {
  console.log('🌱 Seeding opteraOS database...');

  // 1. Create Demo User
  const passwordHash = await hashPassword('Password123!');
  const user = await prisma.user.upsert({
    where: { email: 'admin@opteraos.com' },
    update: {},
    create: {
      email: 'admin@opteraos.com',
      firstName: 'Alex',
      lastName: 'Vance',
      passwordHash,
      isEmailVerified: true,
    },
  });

  console.log(`👤 User created: ${user.email}`);

  // 2. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      industry: 'B2B SaaS & Automation',
      currency: 'INR',
      country: 'IN',
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: UserRole.OWNER },
      },
      subscription: {
        create: { plan: 'BUSINESS', status: 'ACTIVE' },
      },
    },
  });

  console.log(`🏢 Organization created: ${org.name} (${org.id})`);

  // 3. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: 'Apex Global Logistics',
      company: 'Apex Global Logistics Pvt Ltd',
      email: 'ops@apexlogistics.in',
      phone: '+91 98765 43210',
      status: CustomerStatus.ACTIVE,
      city: 'Mumbai',
      state: 'Maharashtra',
      totalRevenue: 245000,
      tags: ['Enterprise', 'High Value'],
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: 'FinCorp India',
      company: 'FinCorp Financial Services',
      email: 'finance@fincorp.in',
      phone: '+91 98123 45678',
      status: CustomerStatus.ACTIVE,
      city: 'Bangalore',
      state: 'Karnataka',
      totalRevenue: 580000,
      tags: ['Fintech', 'VIP'],
    },
  });

  console.log('👥 Customers seeded');

  // 4. Create Leads
  await prisma.lead.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Rahul Sharma',
        company: 'CloudTech Solutions',
        email: 'rahul@cloudtech.io',
        phone: '+91 99887 76655',
        source: 'Website Form',
        score: 85,
        stage: LeadStage.QUALIFIED,
        createdById: user.id,
      },
      {
        organizationId: org.id,
        name: 'Priya Patel',
        company: 'NextGen Retailers',
        email: 'priya@nextgenretail.com',
        phone: '+91 91234 56789',
        source: 'LinkedIn Inbound',
        score: 72,
        stage: LeadStage.CONTACTED,
        createdById: user.id,
      },
    ],
  });

  console.log('🎯 Leads seeded');

  // 5. Create Deals
  await prisma.deal.createMany({
    data: [
      {
        organizationId: org.id,
        customerId: customer1.id,
        title: 'Enterprise Fleet Automation Suite',
        stage: DealStage.PROPOSAL,
        value: 450000,
        probability: 70,
        ownerId: user.id,
        createdById: user.id,
      },
      {
        organizationId: org.id,
        customerId: customer2.id,
        title: 'AI Automated Reconciliation Module',
        stage: DealStage.NEGOTIATION,
        value: 780000,
        probability: 85,
        ownerId: user.id,
        createdById: user.id,
      },
    ],
  });

  console.log('💼 Deals seeded');

  // 6. Create Products & Inventory
  const p1 = await prisma.product.create({
    data: {
      organizationId: org.id,
      name: 'Ultra Pro AI Workstation',
      sku: 'OPT-SRV-01',
      price: 149999,
      cost: 95000,
      stock: 4,
      minStock: 10,
      supplier: 'Nexus Tech',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      organizationId: org.id,
      name: 'Enterprise Cloud License (1Y)',
      sku: 'OPT-LIC-01',
      price: 49999,
      cost: 12000,
      stock: 45,
      minStock: 15,
      supplier: 'opteraOS Cloud',
    },
  });

  console.log('📦 Products & Inventory seeded');

  // 7. Create Invoices
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      customerId: customer1.id,
      invoiceNumber: 'INV-00001',
      status: InvoiceStatus.PAID,
      subtotal: 149999,
      taxAmount: 26999.82,
      discount: 0,
      total: 176998.82,
      amountPaid: 176998.82,
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: p1.id,
            name: 'Ultra Pro AI Workstation',
            quantity: 1,
            unitPrice: 149999,
            taxRate: 18,
            total: 176998.82,
          },
        ],
      },
    },
  });

  console.log('🧾 Invoices seeded');

  // 8. Create Tasks
  await prisma.task.createMany({
    data: [
      {
        organizationId: org.id,
        title: 'Review Q3 SLA proposal for Apex Global',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 2 * 86400000),
        assigneeId: user.id,
        createdById: user.id,
        customerId: customer1.id,
      },
      {
        organizationId: org.id,
        title: 'Restock Ultra Pro AI Workstations',
        description: 'Current stock is below minimum threshold (4 units remaining).',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.URGENT,
        dueDate: new Date(Date.now() + 86400000),
        assigneeId: user.id,
        createdById: user.id,
      },
    ],
  });

  console.log('✅ Tasks seeded');

  console.log('🚀 opteraOS database seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
