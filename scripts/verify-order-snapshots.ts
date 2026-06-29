/**
 * CI guard: ORDER_ITEM_SNAPSHOT_FIELDS must stay in sync with invoice usage.
 * Run via: npx tsx scripts/verify-order-snapshots.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ORDER_ITEM_SNAPSHOT_FIELDS,
  PRODUCT_TO_ORDER_SNAPSHOT_MAP,
} from '@/modules/order/order-snapshots';

const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
const invoicePath = join(process.cwd(), 'src', 'lib', 'invoice.ts');
const invoiceItemsPath = join(process.cwd(), 'src', 'lib', 'invoice-items.ts');

const schema = readFileSync(schemaPath, 'utf8');
const invoice = readFileSync(invoicePath, 'utf8');
const invoiceItems = readFileSync(invoiceItemsPath, 'utf8');

let failed = false;

for (const field of ORDER_ITEM_SNAPSHOT_FIELDS) {
  const snake = field.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
  if (!schema.includes(snake) && !schema.includes(field)) {
    console.error(`Missing OrderItem column for snapshot field: ${field}`);
    failed = true;
  }
}

for (const snapshotField of Object.values(PRODUCT_TO_ORDER_SNAPSHOT_MAP)) {
  if (!ORDER_ITEM_SNAPSHOT_FIELDS.includes(snapshotField)) {
    console.error(`PRODUCT_TO_ORDER_SNAPSHOT_MAP points to unlisted field: ${snapshotField}`);
    failed = true;
  }
}

// The invoice delegates line-item construction to buildInvoiceLineItems, which must
// read OrderItem snapshot fields (category/hsn) and not the live product alone.
const readsSnapshots =
  invoice.includes('buildInvoiceLineItems') &&
  invoiceItems.includes('item.categoryName') &&
  invoiceItems.includes('item.hsn');
if (!readsSnapshots) {
  console.error('invoice line items may not read OrderItem snapshots — review src/lib/invoice-items.ts');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('Order snapshot contract OK');
