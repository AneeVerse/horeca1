// WHY: Indian B2B buyers need GST-compliant tax invoices to claim input credit.
// This module generates a PDF invoice for a given order, collecting all required
// fields: HSN codes, tax percent per line, GSTIN of buyer, vendor business name.

import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/prisma';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface InvoiceItem {
  productName: string;
  sku: string | null;
  hsn: string | null;
  quantity: number;
  unitPrice: number;   // taxable base price per unit
  taxPercent: number;
  lineTotal: number;   // quantity × unitPrice (ex-tax)
  taxAmount: number;   // lineTotal × taxPercent / 100
  totalWithTax: number;
}

interface TaxGroup {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

// --------------------------------------------------------------------------
// Main export
// --------------------------------------------------------------------------

export async function generateInvoicePdf(orderId: string): Promise<Buffer> {
  // ── 1. Fetch order from DB ───────────────────────────────────────────────
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          businessName: true,
          gstNumber: true,
        },
      },
      vendor: {
        select: {
          businessName: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              sku: true,
              hsn: true,
              taxPercent: true,
            },
          },
        },
      },
    },
  });

  // ── 2. Build line-item data ──────────────────────────────────────────────
  const items: InvoiceItem[] = order.items.map(item => {
    const unitPrice = Number(item.unitPrice);
    const qty = item.quantity;
    const taxPct = Number(item.product.taxPercent ?? 0);
    const lineTotal = unitPrice * qty;
    const taxAmt = lineTotal * (taxPct / 100);
    return {
      productName: item.productName,
      sku: item.product.sku,
      hsn: item.product.hsn,
      quantity: qty,
      unitPrice,
      taxPercent: taxPct,
      lineTotal,
      taxAmount: taxAmt,
      totalWithTax: lineTotal + taxAmt,
    };
  });

  // ── 3. Calculate totals ──────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  // Group tax by rate for the summary block
  const taxGroups = new Map<number, TaxGroup>();
  for (const item of items) {
    const existing = taxGroups.get(item.taxPercent);
    if (existing) {
      existing.taxableAmount += item.lineTotal;
      existing.taxAmount += item.taxAmount;
    } else {
      taxGroups.set(item.taxPercent, {
        rate: item.taxPercent,
        taxableAmount: item.lineTotal,
        taxAmount: item.taxAmount,
      });
    }
  }

  // ── 4. Build PDF ─────────────────────────────────────────────────────────
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_WIDTH = doc.page.width - 100; // account for L+R margins
    const LEFT = 50;

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('TAX INVOICE', LEFT, 50, { align: 'center', width: PAGE_WIDTH });

    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`Order No: ${order.orderNumber}`, LEFT, undefined, { align: 'center', width: PAGE_WIDTH })
      .text(
        `Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}`,
        LEFT,
        undefined,
        { align: 'center', width: PAGE_WIDTH }
      );

    doc.fillColor('#000000');

    // Horizontal rule
    const ruleY = doc.y + 12;
    doc
      .moveTo(LEFT, ruleY)
      .lineTo(LEFT + PAGE_WIDTH, ruleY)
      .stroke('#cccccc');

    doc.y = ruleY + 14;

    // ── Bill To / Vendor ─────────────────────────────────────────────────────
    const col1X = LEFT;
    const col2X = LEFT + PAGE_WIDTH / 2 + 10;
    const twoColY = doc.y;

    // Left column — Bill To
    doc.font('Helvetica-Bold').fontSize(10).text('BILL TO', col1X, twoColY);
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(order.user.fullName || '—', col1X, doc.y + 4)
      .text(order.user.email, col1X, doc.y + 2);

    if (order.user.phone) {
      doc.text(order.user.phone, col1X, doc.y + 2);
    }
    if (order.user.businessName) {
      doc.text(order.user.businessName, col1X, doc.y + 2);
    }
    if (order.user.gstNumber) {
      doc.font('Helvetica-Bold').text(`GSTIN: ${order.user.gstNumber}`, col1X, doc.y + 2);
    }

    const afterBillToY = doc.y;

    // Right column — Vendor
    doc.font('Helvetica-Bold').fontSize(10).text('VENDOR / SUPPLIER', col2X, twoColY);
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(order.vendor.businessName, col2X, twoColY + 16);

    // Move past both columns
    doc.y = Math.max(afterBillToY, twoColY + 60) + 16;

    // Horizontal rule
    const ruleY2 = doc.y;
    doc
      .moveTo(LEFT, ruleY2)
      .lineTo(LEFT + PAGE_WIDTH, ruleY2)
      .stroke('#cccccc');

    doc.y = ruleY2 + 12;

    // ── Items Table ──────────────────────────────────────────────────────────
    // Column widths (must sum to PAGE_WIDTH = ~495 on A4 with 50pt margins)
    const COL = {
      item:      { x: LEFT,       w: 170 },
      hsn:       { x: LEFT + 170, w:  55 },
      qty:       { x: LEFT + 225, w:  40 },
      unitPrice: { x: LEFT + 265, w:  65 },
      tax:       { x: LEFT + 330, w:  45 },
      amount:    { x: LEFT + 375, w:  70 },  // right-aligned
    };

    // Table header
    const headerY = doc.y;
    const headerBg = headerY - 4;
    doc
      .rect(LEFT, headerBg, PAGE_WIDTH, 20)
      .fill('#f0f0f0');

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
    doc.text('Item',       COL.item.x + 4,      headerY, { width: COL.item.w });
    doc.text('HSN',        COL.hsn.x,            headerY, { width: COL.hsn.w });
    doc.text('Qty',        COL.qty.x,            headerY, { width: COL.qty.w });
    doc.text('Unit Price', COL.unitPrice.x,       headerY, { width: COL.unitPrice.w });
    doc.text('Tax %',      COL.tax.x,             headerY, { width: COL.tax.w });
    doc.text('Amount',     COL.amount.x,          headerY, { width: COL.amount.w, align: 'right' });

    doc.y = headerBg + 22;
    doc.font('Helvetica').fontSize(9);

    let rowAlternate = false;
    for (const item of items) {
      // Estimate row height for wrapping product names
      const estimatedRows = Math.ceil(item.productName.length / 28);
      const rowH = Math.max(18, estimatedRows * 12 + 6);

      const rowY = doc.y;
      if (rowAlternate) {
        doc.rect(LEFT, rowY, PAGE_WIDTH, rowH).fill('#fafafa');
      }
      rowAlternate = !rowAlternate;

      doc.fillColor('#000000');
      // Item name — may wrap
      doc.text(item.productName, COL.item.x + 4, rowY + 4, { width: COL.item.w - 4, lineBreak: true });

      const textY = rowY + 4;
      doc.text(item.hsn ?? '—',                    COL.hsn.x,      textY, { width: COL.hsn.w });
      doc.text(String(item.quantity),              COL.qty.x,      textY, { width: COL.qty.w });
      doc.text(fmtCurrency(item.unitPrice),        COL.unitPrice.x, textY, { width: COL.unitPrice.w });
      doc.text(`${item.taxPercent}%`,              COL.tax.x,      textY, { width: COL.tax.w });
      doc.text(fmtCurrency(item.totalWithTax),     COL.amount.x,   textY, { width: COL.amount.w, align: 'right' });

      doc.y = rowY + rowH;
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalStartX = LEFT + PAGE_WIDTH / 2;
    const totalLabelW = PAGE_WIDTH / 2 - 80;
    const totalValueX = LEFT + PAGE_WIDTH - 80;
    const totalValueW = 80;

    doc.moveDown(0.5);
    const totalsLineY = doc.y;
    doc
      .moveTo(LEFT, totalsLineY)
      .lineTo(LEFT + PAGE_WIDTH, totalsLineY)
      .stroke('#cccccc');
    doc.y = totalsLineY + 8;

    // Subtotal
    doc.font('Helvetica').fontSize(10);
    doc.text('Subtotal (ex-tax):', totalStartX, doc.y, { width: totalLabelW });
    doc.text(fmtCurrency(subtotal), totalValueX, doc.y - 12, { width: totalValueW, align: 'right' });
    doc.moveDown(0.3);

    // Tax groups
    for (const grp of taxGroups.values()) {
      doc.text(`GST @ ${grp.rate}%:`, totalStartX, doc.y, { width: totalLabelW });
      doc.text(fmtCurrency(grp.taxAmount), totalValueX, doc.y - 12, { width: totalValueW, align: 'right' });
      doc.moveDown(0.3);
    }

    // Total tax line (if multiple rates)
    if (taxGroups.size > 1) {
      doc.text('Total Tax:', totalStartX, doc.y, { width: totalLabelW });
      doc.text(fmtCurrency(totalTax), totalValueX, doc.y - 12, { width: totalValueW, align: 'right' });
      doc.moveDown(0.3);
    }

    // Grand total
    const grandLineY = doc.y;
    doc
      .moveTo(totalStartX, grandLineY)
      .lineTo(LEFT + PAGE_WIDTH, grandLineY)
      .stroke('#999999');
    doc.y = grandLineY + 6;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('GRAND TOTAL:', totalStartX, doc.y, { width: totalLabelW });
    doc.text(fmtCurrency(grandTotal), totalValueX, doc.y - 14, { width: totalValueW, align: 'right' });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#888888')
      .text(
        'This is a computer-generated invoice and does not require a physical signature.',
        LEFT,
        doc.page.height - 60,
        { width: PAGE_WIDTH, align: 'center' }
      );

    doc.end();
  });
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function fmtCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
