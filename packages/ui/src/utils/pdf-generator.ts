import { formatCurrency, shortDate } from "@/lib/format";

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoicePrintData {
  invoice_number: string;
  created_at: string;
  due_date: string | null;
  amount: number;
  tax_rate?: number;
  status: string;
  items?: LineItem[];
  customer?: {
    name: string;
    email: string | null;
    phone?: string | null;
    company?: string | null;
  };
  org?: {
    name: string;
    email?: string | null;
    currency?: string;
    phone?: string | null;
    address?: string | null;
  };
}

export function generateInvoiceHtml(data: InvoicePrintData): string {
  const orgName = data.org?.name || "opteraOS Workspace";
  const orgEmail = data.org?.email || "";
  const orgPhone = data.org?.phone || "";
  const orgAddress = data.org?.address || "";
  const currency = data.org?.currency || "INR";

  const customerName = data.customer?.name || "Valued Customer";
  const customerEmail = data.customer?.email || "";
  const customerCompany = data.customer?.company || "";
  const customerPhone = data.customer?.phone || "";

  const statusColors: Record<string, string> = {
    paid: "#10B981",
    overdue: "#EF4444",
    sent: "#3B82F6",
    draft: "#94A3B8",
    void: "#6B7280",
  };
  const statusColor = statusColors[data.status] ?? "#F59E0B";

  // Line items — use provided items or derive a single default item from amount
  const taxRate = Number(data.tax_rate ?? 0);
  const providedItems = data.items && data.items.length > 0 ? data.items : null;
  const items: LineItem[] = providedItems || [
    {
      description: "Services Rendered",
      quantity: 1,
      unit_price: Number(data.amount) || 0,
    },
  ];

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const formatAmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n);

  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:14px 16px; border-bottom:1px solid #F1F5F9; font-size:13px; color:#1E293B;">${item.description}</td>
      <td style="padding:14px 16px; border-bottom:1px solid #F1F5F9; font-size:13px; text-align:center; color:#475569;">${item.quantity}</td>
      <td style="padding:14px 16px; border-bottom:1px solid #F1F5F9; font-size:13px; text-align:right; color:#475569;">${formatAmt(item.unit_price)}</td>
      <td style="padding:14px 16px; border-bottom:1px solid #F1F5F9; font-size:13px; text-align:right; font-weight:600; color:#1E293B;">${formatAmt(item.quantity * item.unit_price)}</td>
    </tr>`,
    )
    .join("");

  const taxRow =
    taxRate > 0
      ? `<tr>
      <td style="padding:6px 0; font-size:13px; color:#64748B;">Tax (${taxRate}%)</td>
      <td style="padding:6px 0; font-size:13px; text-align:right; color:#64748B;">${formatAmt(taxAmount)}</td>
    </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${data.invoice_number} — ${orgName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F8FAFC;
      color: #1E293B;
      padding: 32px;
      font-size: 14px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .header-band {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      padding: 36px 40px;
      color: #fff;
    }
    .header-inner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #fff;
    }
    .brand-sub {
      font-size: 13px;
      color: rgba(255,255,255,0.75);
      margin-top: 4px;
    }
    .invoice-meta { text-align: right; }
    .invoice-label {
      font-size: 32px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      letter-spacing: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #fff;
      background: ${statusColor};
      margin-top: 8px;
    }
    .body { padding: 40px; }
    .parties {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 36px;
    }
    .party { flex: 1; }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94A3B8;
      margin-bottom: 10px;
    }
    .party-name {
      font-size: 16px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 4px;
    }
    .party-detail {
      font-size: 12px;
      color: #64748B;
      margin-top: 2px;
    }
    .meta-grid {
      display: flex;
      gap: 32px;
      background: #F8FAFC;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 32px;
    }
    .meta-item { flex: 1; }
    .meta-key {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94A3B8;
      margin-bottom: 4px;
    }
    .meta-val {
      font-size: 14px;
      font-weight: 600;
      color: #1E293B;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #F8FAFC; }
    th {
      padding: 12px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      border-bottom: 2px solid #E2E8F0;
    }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .totals-box {
      width: 300px;
      background: #F8FAFC;
      border-radius: 12px;
      padding: 20px 24px;
    }
    .totals-table { width: 100%; border-collapse: collapse; }
    .totals-table td { padding: 5px 0; font-size: 13px; color: #475569; }
    .totals-table td:last-child { text-align: right; }
    .grand-total-row td {
      padding-top: 14px !important;
      border-top: 2px solid #1E293B;
      font-size: 17px !important;
      font-weight: 700 !important;
      color: #1E293B !important;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #E2E8F0;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
    }
    .footer-brand {
      font-weight: 600;
      color: #4F46E5;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-band">
      <div class="header-inner">
        <div>
          <div class="brand-name">opteraOS</div>
          <div class="brand-sub">${orgName}</div>
          ${orgEmail ? `<div class="brand-sub">${orgEmail}</div>` : ""}
          ${orgPhone ? `<div class="brand-sub">${orgPhone}</div>` : ""}
          ${orgAddress ? `<div class="brand-sub">${orgAddress}</div>` : ""}
        </div>
        <div class="invoice-meta">
          <div class="invoice-label">INVOICE</div>
          <div style="color:rgba(255,255,255,0.8); font-size:15px; margin-top:4px;">#${data.invoice_number}</div>
          <div>
            <span class="status-badge">${data.status.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="parties">
        <div class="party">
          <div class="party-label">Billed To</div>
          <div class="party-name">${customerName}</div>
          ${customerCompany ? `<div class="party-detail">${customerCompany}</div>` : ""}
          ${customerEmail ? `<div class="party-detail">${customerEmail}</div>` : ""}
          ${customerPhone ? `<div class="party-detail">${customerPhone}</div>` : ""}
        </div>
        <div class="party" style="text-align:right;">
          <div class="party-label">Issued By</div>
          <div class="party-name">${orgName}</div>
          ${orgEmail ? `<div class="party-detail">${orgEmail}</div>` : ""}
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-key">Invoice Number</div>
          <div class="meta-val">#${data.invoice_number}</div>
        </div>
        <div class="meta-item">
          <div class="meta-key">Issue Date</div>
          <div class="meta-val">${shortDate(data.created_at)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-key">Due Date</div>
          <div class="meta-val">${data.due_date ? shortDate(data.due_date) : "On Receipt"}</div>
        </div>
        <div class="meta-item">
          <div class="meta-key">Status</div>
          <div class="meta-val" style="color:${statusColor};">${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="totals-wrapper">
        <div class="totals-box">
          <table class="totals-table">
            <tr>
              <td>Subtotal</td>
              <td>${formatAmt(subtotal)}</td>
            </tr>
            ${taxRow}
            <tr class="grand-total-row">
              <td>Total Due</td>
              <td>${formatAmt(grandTotal)}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business, <strong>${customerName}</strong>!</p>
        <p style="margin-top:6px;">
          Issued by <span class="footer-brand">${orgName}</span> · Powered by
          <span class="footer-brand">opteraOS</span> — AI-Powered Business Operating System
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadInvoicePdf(data: InvoicePrintData) {
  const htmlContent = generateInvoiceHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to download the invoice PDF.");
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  // Give fonts/styles time to load before triggering print
  setTimeout(() => {
    printWindow.print();
  }, 600);
}
