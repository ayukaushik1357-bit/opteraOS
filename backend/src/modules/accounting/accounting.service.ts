import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, JournalEntryStatus } from '@prisma/client';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // ─── Chart of Accounts ───────────────────────────────────────────────────
  async getAccounts(orgId: string) {
    return this.prisma.account.findMany({
      where: { organizationId: orgId },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async getAccount(orgId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, organizationId: orgId },
      include: {
        journalItems: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: { entry: true },
        },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async createAccount(orgId: string, dto: { code: string; name: string; type: AccountType; description?: string }) {
    const existing = await this.prisma.account.findFirst({
      where: { organizationId: orgId, code: dto.code },
    });
    if (existing) throw new BadRequestException(`Account with code ${dto.code} already exists`);

    return this.prisma.account.create({
      data: {
        organizationId: orgId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  async updateAccount(orgId: string, id: string, dto: { name?: string; description?: string; isActive?: boolean }) {
    await this.getAccount(orgId, id);
    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  // ─── Seed Default Chart of Accounts ──────────────────────────────────────
  async seedStandardCoA(orgId: string) {
    const standardAccounts = [
      { code: '1000', name: 'Main Bank Account', type: AccountType.ASSET },
      { code: '1010', name: 'Petty Cash', type: AccountType.ASSET },
      { code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET },
      { code: '1200', name: 'Inventory Stock Asset', type: AccountType.ASSET },
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
      { code: '2100', name: 'GST / VAT Output Tax', type: AccountType.LIABILITY },
      { code: '3000', name: 'Owner Equity & Retained Earnings', type: AccountType.EQUITY },
      { code: '4000', name: 'Product Sales Revenue', type: AccountType.REVENUE },
      { code: '4100', name: 'Services & Consulting Revenue', type: AccountType.REVENUE },
      { code: '5000', name: 'Cost of Goods Sold (COGS)', type: AccountType.EXPENSE },
      { code: '6000', name: 'Operating & Admin Expenses', type: AccountType.EXPENSE },
      { code: '6100', name: 'Marketing & Advertising', type: AccountType.EXPENSE },
      { code: '6200', name: 'Salaries & Payroll', type: AccountType.EXPENSE },
    ];

    for (const acc of standardAccounts) {
      await this.prisma.account.upsert({
        where: { organizationId_code: { organizationId: orgId, code: acc.code } },
        update: {},
        create: {
          organizationId: orgId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
        },
      });
    }

    return this.getAccounts(orgId);
  }

  // ─── Journal Entries (Double-Entry Balanced Books) ────────────────────────
  async getJournalEntries(orgId: string, query: { page?: number; pageSize?: number; status?: JournalEntryStatus } = {}) {
    const { page = 1, pageSize = 50, status } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [rows, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { date: 'desc' },
        include: {
          items: {
            include: { account: { select: { code: true, name: true, type: true } } },
          },
        },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async getJournalEntry(orgId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: {
          include: { account: true },
        },
      },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async createJournalEntry(orgId: string, dto: {
    date?: string;
    reference?: string;
    notes?: string;
    items: Array<{ accountId: string; name: string; partnerName?: string; debit: number; credit: number }>;
  }) {
    const count = await this.prisma.journalEntry.count({ where: { organizationId: orgId } });
    const entryNumber = `JE-${String(count + 1).padStart(5, '0')}`;

    const totalDebit = dto.items.reduce((s, i) => s + Number(i.debit || 0), 0);
    const totalCredit = dto.items.reduce((s, i) => s + Number(i.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(`Unbalanced journal entry: Total Debit (${totalDebit}) must equal Total Credit (${totalCredit})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          organizationId: orgId,
          entryNumber,
          date: dto.date ? new Date(dto.date) : new Date(),
          reference: dto.reference,
          notes: dto.notes,
          status: JournalEntryStatus.POSTED,
          postedAt: new Date(),
          items: {
            create: dto.items.map((i) => ({
              accountId: i.accountId,
              name: i.name,
              partnerName: i.partnerName,
              debit: i.debit,
              credit: i.credit,
            })),
          },
        },
        include: { items: { include: { account: true } } },
      });

      // Update account balances
      for (const item of dto.items) {
        const netChange = Number(item.debit) - Number(item.credit);
        await tx.account.update({
          where: { id: item.accountId },
          data: { balance: { increment: netChange } },
        });
      }

      return entry;
    });
  }

  // ─── Financial Statements & Reporting ─────────────────────────────────────
  async getFinancialReports(orgId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { journalItems: true },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    const categorized: Record<AccountType, any[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };

    for (const acc of accounts) {
      const balance = Number(acc.balance);
      categorized[acc.type].push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        balance,
      });

      if (acc.type === AccountType.ASSET) totalAssets += balance;
      else if (acc.type === AccountType.LIABILITY) totalLiabilities += balance;
      else if (acc.type === AccountType.EQUITY) totalEquity += balance;
      else if (acc.type === AccountType.REVENUE) totalRevenue += Math.abs(balance);
      else if (acc.type === AccountType.EXPENSE) totalExpenses += Math.abs(balance);
    }

    const netProfit = totalRevenue - totalExpenses;

    return {
      balanceSheet: {
        assets: categorized.ASSET,
        liabilities: categorized.LIABILITY,
        equity: categorized.EQUITY,
        totalAssets,
        totalLiabilities,
        totalEquity: totalEquity + netProfit,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfit)) < 1,
      },
      profitAndLoss: {
        revenue: categorized.REVENUE,
        expenses: categorized.EXPENSE,
        totalRevenue,
        totalExpenses,
        netProfit,
        netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      },
    };
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────
  async getExpenses(orgId: string, query: { page?: number; pageSize?: number } = {}) {
    const { page = 1, pageSize = 50 } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: { organizationId: orgId },
        skip,
        take: Number(pageSize),
        orderBy: { date: 'desc' },
        include: { account: true, employee: true },
      }),
      this.prisma.expense.count({ where: { organizationId: orgId } }),
    ]);
    return { rows, total, page: Number(page), pageSize: Number(pageSize), pages: Math.ceil(total / Number(pageSize)) };
  }

  async createExpense(orgId: string, dto: any) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        organizationId: orgId,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
      include: { account: true, employee: true },
    });
  }

  // ─── Taxes ────────────────────────────────────────────────────────────────
  async getTaxes(orgId: string) {
    return this.prisma.tax.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async createTax(orgId: string, dto: { name: string; rate: number; type?: string }) {
    return this.prisma.tax.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        rate: dto.rate,
        type: dto.type ?? 'percentage',
      },
    });
  }
}
