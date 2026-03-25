import * as XLSX from 'xlsx';
import { z } from 'zod';

// ── Product Import/Export ──

const productImportRowSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  vendorId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.coerce.number().positive(),
  originalPrice: z.coerce.number().positive().optional(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  sku: z.string().optional(),
  hsn: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.string().optional(), // semicolon-separated
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  minOrderQty: z.coerce.number().int().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type ProductImportRow = z.infer<typeof productImportRowSchema>;

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ProductImportResult {
  rows: (ProductImportRow & { tags?: string })[];
  errors: ImportError[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanRow(raw: Record<string, any>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    const k = key.trim();
    cleaned[k] = typeof val === 'string' ? val.trim() : val;
    // Convert empty strings to undefined
    if (cleaned[k] === '') cleaned[k] = undefined;
  }
  return cleaned;
}

export function parseProductImport(buffer: Buffer): ProductImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

  const rows: ProductImportRow[] = [];
  const errors: ImportError[] = [];

  rawRows.forEach((raw, idx) => {
    const cleaned = cleanRow(raw);
    const result = productImportRowSchema.safeParse(cleaned);
    if (result.success) {
      rows.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: idx + 2, // +2 for header row + 0-index
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
    }
  });

  return { rows, errors };
}

interface ProductExportRow {
  name: string;
  slug: string;
  vendorName?: string;
  categoryName?: string;
  basePrice: number | string;
  originalPrice?: number | string | null;
  packSize?: string | null;
  unit?: string | null;
  sku?: string | null;
  hsn?: string | null;
  brand?: string | null;
  barcode?: string | null;
  tags?: string[] | string;
  taxPercent?: number | string;
  minOrderQty?: number;
  description?: string | null;
  imageUrl?: string | null;
  approvalStatus?: string;
  stock?: number;
}

export function exportProductsToXlsx(products: ProductExportRow[]): Buffer {
  const data = products.map(p => ({
    Name: p.name,
    Slug: p.slug,
    Vendor: p.vendorName || '',
    Category: p.categoryName || '',
    'Base Price': Number(p.basePrice),
    'Original Price': p.originalPrice ? Number(p.originalPrice) : '',
    'Pack Size': p.packSize || '',
    Unit: p.unit || '',
    SKU: p.sku || '',
    HSN: p.hsn || '',
    Brand: p.brand || '',
    Barcode: p.barcode || '',
    Tags: Array.isArray(p.tags) ? p.tags.join('; ') : (p.tags || ''),
    'Tax %': p.taxPercent ? Number(p.taxPercent) : 0,
    'Min Order Qty': p.minOrderQty || 1,
    Description: p.description || '',
    'Image URL': p.imageUrl || '',
    Status: p.approvalStatus || '',
    Stock: p.stock ?? '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  // Auto-width columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length + 2, 15),
  }));
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function exportProductsToCsv(products: ProductExportRow[]): string {
  const data = products.map(p => ({
    name: p.name,
    slug: p.slug,
    vendorName: p.vendorName || '',
    categoryName: p.categoryName || '',
    basePrice: Number(p.basePrice),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : '',
    packSize: p.packSize || '',
    unit: p.unit || '',
    sku: p.sku || '',
    hsn: p.hsn || '',
    brand: p.brand || '',
    barcode: p.barcode || '',
    tags: Array.isArray(p.tags) ? p.tags.join('; ') : (p.tags || ''),
    taxPercent: p.taxPercent ? Number(p.taxPercent) : 0,
    minOrderQty: p.minOrderQty || 1,
    description: p.description || '',
    imageUrl: p.imageUrl || '',
    approvalStatus: p.approvalStatus || '',
    stock: p.stock ?? '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return XLSX.utils.sheet_to_csv(ws);
}

// ── Category Import/Export ──

const categoryImportRowSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  parentSlug: z.string().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CategoryImportRow = z.infer<typeof categoryImportRowSchema>;

interface CategoryImportResult {
  rows: CategoryImportRow[];
  errors: ImportError[];
}

export function parseCategoryImport(buffer: Buffer): CategoryImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

  const rows: CategoryImportRow[] = [];
  const errors: ImportError[] = [];

  rawRows.forEach((raw, idx) => {
    const cleaned = cleanRow(raw);
    const result = categoryImportRowSchema.safeParse(cleaned);
    if (result.success) {
      rows.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        errors.push({
          row: idx + 2,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
    }
  });

  return { rows, errors };
}

interface CategoryExportRow {
  name: string;
  slug: string;
  parentName?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  approvalStatus: string;
  productCount?: number;
}

export function exportCategoriesToXlsx(categories: CategoryExportRow[]): Buffer {
  const data = categories.map(c => ({
    Name: c.name,
    Slug: c.slug,
    Parent: c.parentName || '',
    'Image URL': c.imageUrl || '',
    'Sort Order': c.sortOrder,
    Active: c.isActive ? 'Yes' : 'No',
    Status: c.approvalStatus,
    Products: c.productCount ?? 0,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length + 2, 12) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Categories');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function exportCategoriesToCsv(categories: CategoryExportRow[]): string {
  const data = categories.map(c => ({
    name: c.name,
    slug: c.slug,
    parentName: c.parentName || '',
    imageUrl: c.imageUrl || '',
    sortOrder: c.sortOrder,
    isActive: c.isActive ? 'Yes' : 'No',
    approvalStatus: c.approvalStatus,
    productCount: c.productCount ?? 0,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Categories');
  return XLSX.utils.sheet_to_csv(ws);
}
