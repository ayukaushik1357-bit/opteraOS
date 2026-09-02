import PDFDocument from 'pdfkit';

export interface QuotationPdfData {
  organization: {
    name: string;
    legalName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    currency?: string;
  };
  quotationNumber: string;
  quotationDate: Date;
  expirationDate?: Date | null;
  paymentTerms?: string | null;
  currency: string;
  customer?: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
    subtotal: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  terms?: string | null;
  notes?: string | null;
}

export function generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', (err) => reject(err));

    const currency = data.currency || 'INR';

    // ── Header Section ──────────────────────────────────────────────────────
    doc
      .fillColor('#1E293B')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(data.organization.legalName || data.organization.name, 45, 45);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748B')
      .text(data.organization.address || 'Corporate Headquarters', 45, 72)
      .text(`${data.organization.city || ''} ${data.organization.state || ''} ${data.organization.country || ''}`.trim(), 45, 84)
      .text(`Email: ${data.organization.email || 'sales@company.com'} | Tel: ${data.organization.phone || '+91 0000000000'}`, 45, 96);

    // Right-aligned Document Label & Number
    doc
      .fillColor('#4F46E5')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('SALES QUOTATION', 350, 45, { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1E293B')
      .text(data.quotationNumber, 350, 68, { align: 'right' });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748B')
      .text(`Date: ${new Date(data.quotationDate).toLocaleDateString('en-GB')}`, 350, 84, { align: 'right' })
      .text(`Valid Until: ${data.expirationDate ? new Date(data.expirationDate).toLocaleDateString('en-GB') : '30 Days from issue'}`, 350, 96, { align: 'right' });

    // Divider
    doc
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .moveTo(45, 115)
      .lineTo(550, 115)
      .stroke();

    // ── Customer Information ─────────────────────────────────────────────────
    doc
      .fillColor('#475569')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('QUOTATION ISSUED TO:', 45, 128);

    doc
      .fillColor('#0F172A')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(data.customer?.company || data.customer?.name || 'Valued Customer', 45, 142);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`Attn: ${data.customer?.name || 'Procurement Officer'}`, 45, 156)
      .text(`Email: ${data.customer?.email || 'N/A'} | Phone: ${data.customer?.phone || 'N/A'}`, 45, 168);

    if (data.customer?.address) {
      doc.text(`${data.customer.address}, ${data.customer.city || ''}`, 45, 180);
    }

    // ── Table Header ─────────────────────────────────────────────────────────
    const tableTop = 205;
    doc
      .rect(45, tableTop, 505, 22)
      .fill('#F8FAFC');

    doc
      .strokeColor('#E2E8F0')
      .lineWidth(0.5)
      .rect(45, tableTop, 505, 22)
      .stroke();

    doc
      .fillColor('#334155')
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text('DESCRIPTION', 55, tableTop + 6)
      .text('QTY', 280, tableTop + 6, { width: 35, align: 'right' })
      .text('UNIT PRICE', 325, tableTop + 6, { width: 65, align: 'right' })
      .text('DISC %', 400, tableTop + 6, { width: 40, align: 'right' })
      .text('TAX %', 450, tableTop + 6, { width: 35, align: 'right' })
      .text('TOTAL', 490, tableTop + 6, { width: 55, align: 'right' });

    // ── Table Rows ───────────────────────────────────────────────────────────
    let currentY = tableTop + 26;
    doc.font('Helvetica').fontSize(8.5);

    data.items.forEach((item, index) => {
      const isEven = index % 2 === 1;
      if (isEven) {
        doc.rect(45, currentY - 3, 505, 18).fill('#FDFDFD');
      }

      doc
        .fillColor('#1E293B')
        .text(item.description, 55, currentY, { width: 220, ellipsis: true })
        .text(String(item.quantity), 280, currentY, { width: 35, align: 'right' })
        .text(Number(item.unitPrice).toFixed(2), 325, currentY, { width: 65, align: 'right' })
        .text(`${item.discountPercent || 0}%`, 400, currentY, { width: 40, align: 'right' })
        .text(`${item.taxRate || 0}%`, 450, currentY, { width: 35, align: 'right' })
        .text(Number(item.total).toFixed(2), 490, currentY, { width: 55, align: 'right' });

      currentY += 18;
    });

    // ── Summary Section ──────────────────────────────────────────────────────
    doc
      .strokeColor('#CBD5E1')
      .lineWidth(0.5)
      .moveTo(320, currentY + 5)
      .lineTo(550, currentY + 5)
      .stroke();

    const summaryY = currentY + 12;
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Subtotal:', 340, summaryY, { width: 100, align: 'right' })
      .text(`${currency} ${Number(data.subtotal).toFixed(2)}`, 450, summaryY, { width: 95, align: 'right' });

    doc
      .text('Estimated Taxes:', 340, summaryY + 14, { width: 100, align: 'right' })
      .text(`${currency} ${Number(data.taxAmount).toFixed(2)}`, 450, summaryY + 14, { width: 95, align: 'right' });

    if (data.discountAmount > 0) {
      doc
        .text('Special Discount:', 340, summaryY + 28, { width: 100, align: 'right' })
        .text(`- ${currency} ${Number(data.discountAmount).toFixed(2)}`, 450, summaryY + 28, { width: 95, align: 'right' });
    }

    const totalBoxY = summaryY + (data.discountAmount > 0 ? 46 : 32);
    doc
      .rect(330, totalBoxY - 4, 220, 26)
      .fill('#EEF2FF');

    doc
      .fillColor('#3730A3')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TOTAL AMOUNT:', 340, totalBoxY + 3, { width: 100, align: 'right' })
      .text(`${currency} ${Number(data.total).toFixed(2)}`, 450, totalBoxY + 3, { width: 95, align: 'right' });

    // ── Terms and Conditions ─────────────────────────────────────────────────
    const termsY = Math.max(totalBoxY + 45, 580);
    doc
      .fillColor('#334155')
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text('Terms & Conditions:', 45, termsY);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#64748B')
      .text(data.terms || '1. Prices valid for 30 days. 2. Standard payment terms apply. 3. Goods once confirmed will be scheduled for delivery.', 45, termsY + 12, { width: 320 });

    // Signature box
    doc
      .strokeColor('#CBD5E1')
      .lineWidth(0.5)
      .rect(400, termsY, 150, 50)
      .stroke();

    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#94A3B8')
      .text('Authorized Customer Signature', 405, termsY + 36, { width: 140, align: 'center' });

    // Footer
    doc
      .fontSize(7.5)
      .fillColor('#94A3B8')
      .text('Generated electronically via opteraOS Business Platform — Legally binding upon acceptance.', 45, 780, { align: 'center', width: 505 });

    doc.end();
  });
}
