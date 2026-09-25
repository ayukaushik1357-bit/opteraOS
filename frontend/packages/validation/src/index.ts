import { z } from "zod";

export const orgInputSchema = z.object({ orgId: z.string().uuid() });

export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(["active", "prospect", "churned"]),
});

export const dealSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  value: z.number().min(0),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
  customerId: z.string().uuid().optional().or(z.literal("")),
  expectedClose: z.string().optional().or(z.literal("")),
});

export const dealStageSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
});

export const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().min(0.001),
  unit_price: z.number().min(0),
});

export const invoiceSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  number: z.string().trim().min(1).max(40),
  amount: z.number().min(0),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
  customerId: z.string().uuid().optional().or(z.literal("")),
  issueDate: z.string().min(4),
  dueDate: z.string().optional().or(z.literal("")),
  lineItems: z.array(lineItemSchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

export const invoiceStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
});

export const leadSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  score: z.number().int().min(0).max(100).optional(),
  stage: z.enum(["new", "contacted", "qualified", "unqualified"]),
  ownerId: z.string().uuid().optional().or(z.literal("")),
});

export const taskSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().optional().or(z.literal("")),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["Todo", "In Progress", "Completed", "Cancelled"]),
  assigneeId: z.string().uuid().optional().or(z.literal("")),
  customerId: z.string().uuid().optional().or(z.literal("")),
  dealId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const departmentSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export const teamSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
});

export const memberTeamAssignSchema = z.object({
  memberId: z.string().uuid(),
  teamId: z.string().uuid().optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  jobTitle: z.string().trim().max(100).optional().or(z.literal("")),
});
