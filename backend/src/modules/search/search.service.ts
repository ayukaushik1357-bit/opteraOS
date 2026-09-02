import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SearchResultItem {
  id: string;
  type: 'contact' | 'company' | 'employee' | 'customer' | 'lead' | 'deal' | 'task';
  title: string;
  subtitle?: string;
  status?: string;
  url: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(orgId: string, query: string, limit = 5): Promise<SearchResultItem[]> {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim();

    const [contacts, companies, employees, customers, leads, deals, tasks] = await Promise.all([
      // Contacts
      this.prisma.contact.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { jobTitle: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, email: true, jobTitle: true, status: true },
      }),

      // Companies
      this.prisma.company.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { legalName: { contains: q, mode: 'insensitive' } },
            { industry: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, displayName: true, legalName: true, industry: true, status: true },
      }),

      // Employees
      this.prisma.employee.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { jobTitle: { contains: q, mode: 'insensitive' } },
            { employeeNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, displayName: true, firstName: true, lastName: true, jobTitle: true, employeeNumber: true, status: true },
      }),

      // Customers
      this.prisma.customer.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, email: true, company: true, status: true },
      }),

      // Leads
      this.prisma.lead.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, name: true, company: true, stage: true },
      }),

      // Deals
      this.prisma.deal.findMany({
        where: {
          organizationId: orgId,
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, value: true, stage: true },
      }),

      // Tasks
      this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, priority: true, status: true },
      }),
    ]);

    const results: SearchResultItem[] = [];

    contacts.forEach((c) =>
      results.push({
        id: c.id,
        type: 'contact',
        title: c.name,
        subtitle: c.email || c.jobTitle || undefined,
        status: c.status,
        url: `/contacts?id=${c.id}`,
      }),
    );

    companies.forEach((comp) =>
      results.push({
        id: comp.id,
        type: 'company',
        title: comp.displayName || comp.legalName,
        subtitle: comp.industry || undefined,
        status: comp.status,
        url: `/companies?id=${comp.id}`,
      }),
    );

    employees.forEach((e) =>
      results.push({
        id: e.id,
        type: 'employee',
        title: e.displayName || `${e.firstName} ${e.lastName}`,
        subtitle: `${e.jobTitle} (${e.employeeNumber})`,
        status: e.status,
        url: `/hr?id=${e.id}`,
      }),
    );

    customers.forEach((c) =>
      results.push({
        id: c.id,
        type: 'customer',
        title: c.name,
        subtitle: c.company || c.email || undefined,
        status: c.status,
        url: `/customers?id=${c.id}`,
      }),
    );

    leads.forEach((l) =>
      results.push({
        id: l.id,
        type: 'lead',
        title: l.name,
        subtitle: l.company || undefined,
        status: l.stage,
        url: `/leads?id=${l.id}`,
      }),
    );

    deals.forEach((d) =>
      results.push({
        id: d.id,
        type: 'deal',
        title: d.title,
        subtitle: `Value: ${d.value}`,
        status: d.stage,
        url: `/deals?id=${d.id}`,
      }),
    );

    tasks.forEach((t) =>
      results.push({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: `Priority: ${t.priority}`,
        status: t.status,
        url: `/tasks?id=${t.id}`,
      }),
    );

    return results;
  }
}
