/**
 * Centralized frontend mock-data layer.
 * Replace each export with a real API call when the backend lands.
 */

export type Status = string;

export type MockCustomer = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: "active" | "prospect" | "churned";
  value: number;
  city: string;
  createdAt: string;
  lastActivity: string;
};

export type MockLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  source: "Website" | "WhatsApp" | "Referral" | "Campaign" | "Inbound call";
  score: number;
  stage: "new" | "qualified" | "contacted" | "unqualified";
  owner: string;
  createdAt: string;
};

export type MockDeal = {
  id: string;
  title: string;
  customer: string;
  value: number;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  owner: string;
  closeDate: string;
};

export type MockOrder = {
  id: string;
  customer: string;
  items: number;
  amount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  placedAt: string;
};

export type MockInvoice = {
  id: string;
  number: string;
  customer: string;
  issuedAt: string;
  dueAt: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  items: { description: string; qty: number; rate: number }[];
};

export type MockPayment = {
  id: string;
  reference: string;
  customer: string;
  method: "UPI" | "Card" | "Netbanking" | "Bank transfer";
  amount: number;
  status: "captured" | "pending" | "failed" | "refunded";
  paidAt: string;
};

export type MockProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  reorderAt: number;
};

export const mockCustomers: MockCustomer[] = [
  { id: "c1", name: "Ananya Rao", company: "Meridian Textiles", email: "ananya@meridiantex.in", phone: "+91 98450 21134", status: "active", value: 842000, city: "Bengaluru", createdAt: "2025-11-04", lastActivity: "2026-08-06" },
  { id: "c2", name: "Rohit Malhotra", company: "Northline Logistics", email: "rohit@northline.co", phone: "+91 99870 44521", status: "active", value: 615000, city: "Pune", createdAt: "2025-09-18", lastActivity: "2026-08-08" },
  { id: "c3", name: "Farah Sheikh", company: "Bluewave Interiors", email: "farah@bluewave.design", phone: "+91 90040 77812", status: "prospect", value: 180000, city: "Hyderabad", createdAt: "2026-03-22", lastActivity: "2026-07-29" },
  { id: "c4", name: "Vikram Nair", company: "Cobalt Foods", email: "vikram@cobaltfoods.in", phone: "+91 98204 11290", status: "active", value: 1204000, city: "Mumbai", createdAt: "2025-06-02", lastActivity: "2026-08-09" },
  { id: "c5", name: "Sana Kapoor", company: "Aurum Jewels", email: "sana@aurumjewels.in", phone: "+91 93110 66234", status: "churned", value: 96000, city: "Delhi", createdAt: "2024-12-11", lastActivity: "2026-02-14" },
  { id: "c6", name: "Dev Patel", company: "Sunhaven Realty", email: "dev@sunhaven.co.in", phone: "+91 97690 33045", status: "prospect", value: 340000, city: "Ahmedabad", createdAt: "2026-05-30", lastActivity: "2026-08-01" },
  { id: "c7", name: "Meera Iyer", company: "Kavya Analytics", email: "meera@kavya.ai", phone: "+91 89390 55001", status: "active", value: 498000, city: "Chennai", createdAt: "2026-01-15", lastActivity: "2026-08-07" },
  { id: "c8", name: "Arjun Sethi", company: "Tempo Sportswear", email: "arjun@temposport.in", phone: "+91 90112 87766", status: "active", value: 265000, city: "Jaipur", createdAt: "2026-02-09", lastActivity: "2026-08-05" },
];

export const mockLeads: MockLead[] = [
  { id: "l1", name: "Karthik Menon", company: "Vertex Auto Parts", email: "karthik@vertexauto.in", source: "Website", score: 88, stage: "qualified", owner: "Priya S.", createdAt: "2026-08-09" },
  { id: "l2", name: "Nisha Verma", company: "Loom & Co", email: "nisha@loomandco.in", source: "WhatsApp", score: 74, stage: "contacted", owner: "Rahul D.", createdAt: "2026-08-08" },
  { id: "l3", name: "Imran Qureshi", company: "Skyline Pharma", email: "imran@skylinepharma.in", source: "Referral", score: 91, stage: "qualified", owner: "Priya S.", createdAt: "2026-08-08" },
  { id: "l4", name: "Tara Bose", company: "Hearth Cafes", email: "tara@hearthcafes.in", source: "Campaign", score: 52, stage: "new", owner: "Unassigned", createdAt: "2026-08-07" },
  { id: "l5", name: "Manish Gupta", company: "Orbit Print", email: "manish@orbitprint.in", source: "Inbound call", score: 31, stage: "unqualified", owner: "Rahul D.", createdAt: "2026-08-05" },
  { id: "l6", name: "Ritu Sharma", company: "Elan Wellness", email: "ritu@elanwellness.in", source: "Website", score: 67, stage: "contacted", owner: "Neha K.", createdAt: "2026-08-04" },
];

export const mockDeals: MockDeal[] = [
  { id: "d1", title: "Annual platform rollout", customer: "Cobalt Foods", value: 780000, stage: "negotiation", owner: "Priya S.", closeDate: "2026-08-28" },
  { id: "d2", title: "Warehouse automation", customer: "Northline Logistics", value: 460000, stage: "proposal", owner: "Rahul D.", closeDate: "2026-09-06" },
  { id: "d3", title: "CRM migration", customer: "Meridian Textiles", value: 320000, stage: "qualified", owner: "Neha K.", closeDate: "2026-09-15" },
  { id: "d4", title: "Retail POS integration", customer: "Tempo Sportswear", value: 210000, stage: "won", owner: "Priya S.", closeDate: "2026-07-31" },
  { id: "d5", title: "Analytics add-on", customer: "Kavya Analytics", value: 145000, stage: "lead", owner: "Neha K.", closeDate: "2026-09-24" },
  { id: "d6", title: "Franchise pilot", customer: "Hearth Cafes", value: 98000, stage: "lost", owner: "Rahul D.", closeDate: "2026-07-18" },
];

export const mockOrders: MockOrder[] = [
  { id: "o1", customer: "Cobalt Foods", items: 24, amount: 184500, status: "processing", placedAt: "2026-08-09" },
  { id: "o2", customer: "Meridian Textiles", items: 8, amount: 62400, status: "shipped", placedAt: "2026-08-08" },
  { id: "o3", customer: "Tempo Sportswear", items: 41, amount: 271000, status: "delivered", placedAt: "2026-08-06" },
  { id: "o4", customer: "Northline Logistics", items: 3, amount: 24900, status: "pending", placedAt: "2026-08-10" },
  { id: "o5", customer: "Bluewave Interiors", items: 12, amount: 96000, status: "cancelled", placedAt: "2026-08-02" },
  { id: "o6", customer: "Kavya Analytics", items: 6, amount: 58800, status: "delivered", placedAt: "2026-07-30" },
];

export const mockInvoices: MockInvoice[] = [
  { id: "i1", number: "INV-2026-0142", customer: "Cobalt Foods", issuedAt: "2026-08-01", dueAt: "2026-08-15", amount: 184500, status: "sent", items: [{ description: "Growth plan — August", qty: 1, rate: 149500 }, { description: "Onboarding support", qty: 5, rate: 7000 }] },
  { id: "i2", number: "INV-2026-0141", customer: "Meridian Textiles", issuedAt: "2026-07-28", dueAt: "2026-08-04", amount: 62400, status: "overdue", items: [{ description: "Starter plan — July", qty: 1, rate: 52400 }, { description: "Extra seats", qty: 2, rate: 5000 }] },
  { id: "i3", number: "INV-2026-0140", customer: "Tempo Sportswear", issuedAt: "2026-07-25", dueAt: "2026-08-08", amount: 271000, status: "paid", items: [{ description: "Business plan — annual", qty: 1, rate: 271000 }] },
  { id: "i4", number: "INV-2026-0139", customer: "Kavya Analytics", issuedAt: "2026-08-09", dueAt: "2026-08-23", amount: 58800, status: "draft", items: [{ description: "Analytics add-on", qty: 1, rate: 58800 }] },
  { id: "i5", number: "INV-2026-0138", customer: "Northline Logistics", issuedAt: "2026-07-12", dueAt: "2026-07-26", amount: 24900, status: "paid", items: [{ description: "Starter plan — July", qty: 1, rate: 24900 }] },
];

export const mockPayments: MockPayment[] = [
  { id: "p1", reference: "pay_QhT8x2Lm", customer: "Tempo Sportswear", method: "UPI", amount: 271000, status: "captured", paidAt: "2026-08-07" },
  { id: "p2", reference: "pay_QhS1a9Kd", customer: "Northline Logistics", method: "Netbanking", amount: 24900, status: "captured", paidAt: "2026-07-24" },
  { id: "p3", reference: "pay_QhR4z7Bv", customer: "Bluewave Interiors", method: "Card", amount: 96000, status: "refunded", paidAt: "2026-08-03" },
  { id: "p4", reference: "pay_QhP0k5Nn", customer: "Cobalt Foods", method: "Bank transfer", amount: 184500, status: "pending", paidAt: "2026-08-10" },
  { id: "p5", reference: "pay_QhM7c3Ws", customer: "Aurum Jewels", method: "Card", amount: 18000, status: "failed", paidAt: "2026-08-01" },
];

export const mockProducts: MockProduct[] = [
  { id: "pr1", sku: "OPT-TSH-001", name: "Performance Tee", category: "Apparel", price: 1299, stock: 412, reorderAt: 100 },
  { id: "pr2", sku: "OPT-SHO-014", name: "Trail Runner Shoes", category: "Footwear", price: 5499, stock: 38, reorderAt: 60 },
  { id: "pr3", sku: "OPT-BAG-007", name: "Commuter Backpack", category: "Accessories", price: 3299, stock: 0, reorderAt: 25 },
  { id: "pr4", sku: "OPT-BTL-002", name: "Insulated Bottle", category: "Accessories", price: 899, stock: 12, reorderAt: 40 },
  { id: "pr5", sku: "OPT-JKT-021", name: "Windbreaker Jacket", category: "Apparel", price: 4199, stock: 156, reorderAt: 50 },
  { id: "pr6", sku: "OPT-SOC-005", name: "Cushion Socks (3pk)", category: "Apparel", price: 649, stock: 74, reorderAt: 80 },
];

export function stockStatus(p: MockProduct): "In Stock" | "Low stock" | "Critical" | "Out of Stock" {
  if (p.stock === 0) return "Out of Stock";
  if (p.stock <= p.reorderAt * 0.4) return "Critical";
  if (p.stock <= p.reorderAt) return "Low stock";
  return "In Stock";
}

export type RangeKey = "7d" | "30d" | "3m" | "12m";

export const analyticsRanges: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "3m", label: "3 Months" },
  { key: "12m", label: "12 Months" },
];

function series(points: number, base: number, variance: number, labeler: (i: number) => string) {
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin(i / 2) * variance * 0.4;
    const drift = (i / points) * variance;
    return {
      label: labeler(i),
      revenue: Math.round(base + wave + drift),
      orders: Math.round((base + wave + drift) / 900),
      customers: Math.round((base + drift) / 4200),
    };
  });
}

const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

export function analyticsFor(range: RangeKey) {
  switch (range) {
    case "7d":
      return series(7, 42000, 18000, (i) => `D${i + 1}`);
    case "30d":
      return series(30, 39000, 26000, (i) => `${i + 1}`);
    case "3m":
      return series(12, 210000, 90000, (i) => `W${i + 1}`);
    default:
      return series(12, 640000, 680000, (i) => months[i]!);
  }
}

export const mockAiInsights = [
  { id: "a1", title: "Repeat purchases down 22%", detail: "37 high-value customers haven't purchased in 60+ days. Estimated opportunity ₹4.8L.", action: "Create re-engagement campaign" },
  { id: "a2", title: "2 SKUs will stock out this week", detail: "Trail Runner Shoes and Insulated Bottle fall below reorder point at current velocity.", action: "Draft purchase order" },
  { id: "a3", title: "₹2.48L invoices past due", detail: "12 invoices are overdue by more than 7 days across 6 customers.", action: "Send reminder sequence" },
];

export const mockAutomationActivity = [
  { id: "r1", name: "Lead qualification", ranAt: "2 min ago", status: "success" as const, detail: "46 leads scored today" },
  { id: "r2", name: "Invoice reminder", ranAt: "18 min ago", status: "success" as const, detail: "12 reminders sent on WhatsApp" },
  { id: "r3", name: "Low stock alert", ranAt: "1 hr ago", status: "warning" as const, detail: "8 alerts routed to purchasing" },
  { id: "r4", name: "Payment reconciliation", ranAt: "3 hrs ago", status: "failed" as const, detail: "1 payment awaiting webhook verification" },
];

export const mockAutomations = [
  { id: "w1", name: "New lead → AI qualification", trigger: "New Lead", runs: 1284, active: true },
  { id: "w2", name: "Order → invoice → confirmation", trigger: "Order Created", runs: 942, active: true },
  { id: "w3", name: "Overdue invoice reminders", trigger: "Invoice Overdue", runs: 318, active: true },
  { id: "w4", name: "Low stock purchase request", trigger: "Inventory Low", runs: 76, active: false },
];

export const mockIntegrations = [
  { id: "razorpay", name: "Razorpay", category: "Payments", desc: "Collect payments, subscriptions and settlements." },
  { id: "whatsapp", name: "WhatsApp", category: "Communication", desc: "Send templated messages and follow-ups to customers." },
  { id: "email", name: "Email", category: "Marketing", desc: "Transactional and campaign email delivery." },
  { id: "google", name: "Google", category: "Productivity", desc: "Calendar, Sheets and Drive sync for your team." },
  { id: "webhooks", name: "Webhooks", category: "Developer", desc: "Push business events to any external endpoint." },
  { id: "n8n", name: "n8n", category: "Automation", desc: "Extend workflows with a managed execution layer." },
  { id: "rest", name: "REST API", category: "Developer", desc: "Programmatic access to every opteraOS resource." },
];
