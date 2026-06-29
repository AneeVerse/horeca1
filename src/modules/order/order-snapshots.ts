/**
 * Fields snapshotted onto OrderItem at checkout.
 * Invoice/challan MUST read these — never live Product fields.
 * If you add a Product field used on invoices, add it here and to OrderItem schema.
 */
export const ORDER_ITEM_SNAPSHOT_FIELDS = [
  'productName',
  'productSku',
  'hsn',
  'brand',
  'packSize',
  'categoryName',
  'taxPercent',
  'unitPrice',
] as const;

export type OrderItemSnapshotField = (typeof ORDER_ITEM_SNAPSHOT_FIELDS)[number];

/** Product fields that map to OrderItem snapshot columns at checkout. */
export const PRODUCT_TO_ORDER_SNAPSHOT_MAP = {
  name: 'productName',
  sku: 'productSku',
  hsn: 'hsn',
  brand: 'brand',
  packSize: 'packSize',
  taxPercent: 'taxPercent',
} as const satisfies Record<string, OrderItemSnapshotField>;
