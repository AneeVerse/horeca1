import * as XLSX from 'xlsx';
import { z } from 'zod';

// ── Column mapping matching the 6to9 spreadsheet format ──
// A: SKU, B: Product Name, C: HSN, D: Unit, E: Brand, F: Category
// G: Taxable Rate (Amt), H: Tax %, I: Gross Rate 1Pc
// J: Bulk Rates 1 - Qty, K: Bulk Rates 1 - Gross Rate / Unit
// L: Bulk Rates 2 - Qty, M: Bulk Rates 2 - Gross Rate / Unit
// N: 6pm to 9am Promo Rate - Single Unit
// O: 6pm to 9am Bulk Rates 1 - Qty, P: 6pm to 9am Bulk Rates 1 - Unit
// Q: 6pm to 9am Bulk Rates 2 - Qty, R: 6pm to 9am Bulk Rates 2 - Gross Rate / Unit
// S: Available Stock, T: Product Image URL, U: Image Name

// ── Shared helpers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanRow(raw: Record<string, any>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    const k = key.trim();
    cleaned[k] = typeof val === 'string' ? val.trim() : val;
    if (cleaned[k] === '') cleaned[k] = undefined;
  }
  return cleaned;
}

// Gross = taxable * (1 + tax/100)
function toGross(taxable: number, taxPercent: number): number {
  return Math.round(taxable * (1 + taxPercent / 100) * 100) / 100;
}

// Taxable = gross / (1 + tax/100)
function toTaxable(gross: number, taxPercent: number): number {
  if (taxPercent <= 0) return gross;
  return Math.round((gross / (1 + taxPercent / 100)) * 100) / 100;
}

// ══════════════════════════════════════════════════════════════════════════════
// Product Import
// ══════════════════════════════════════════════════════════════════════════════

// Schema matches the spreadsheet column headers exactly
const productImportRowSchema = z.object({
  'SKU': z.string().optional(),
  'Product Name': z.string().min(1, 'Product Name is required'),
  'HSN': z.coerce.string().optional(),
  'Unit': z.string().optional(),
  'Brand': z.string().optional(),
  'Category': z.string().optional(),
  'Taxable Rate (Amt)': z.coerce.number().positive('Taxable Rate must be > 0'),
  'Tax %': z.coerce.number().min(0).max(100).optional(),
  'Gross Rate 1Pc (visible to the Customer)': z.coerce.number().optional(),
  'Bulk Rates 1 - Qty': z.coerce.number().int().min(1).optional(),
  'Bulk Rates 1 - Gross Rate / Unit': z.coerce.number().positive().optional(),
  'Bulk Rates 2 - Qty': z.coerce.number().int().min(1).optional(),
  'Bulk Rates 2 - Gross Rate / Unit': z.coerce.number().positive().optional(),
  '6pm to 9am Promo Rate - Single Unit': z.coerce.number().positive().optional(),
  '6pm to 9am Bulk Rates 1 - Qty': z.coerce.number().int().min(1).optional(),
  '6pm to 9am Bulk Rates 1 - Unit': z.coerce.number().positive().optional(),
  '6pm to 9am Bulk Rates 2 - Qty': z.coerce.number().int().min(1).optional(),
  '6pm to 9am Bulk Rates 2 - Gross Rate / Unit': z.coerce.number().positive().optional(),
  'Available Stock': z.coerce.number().int().min(0).optional(),
  'product image url': z.string().optional(),
  'Image Name': z.string().optional(),
});

export type RawImportRow = z.infer<typeof productImportRowSchema>;

// Normalized row after parsing — flat fields + bulk slabs
export interface ParsedProductRow {
  sku?: string;
  name: string;
  hsn?: string;
  unit?: string;
  brand?: string;
  category?: string; // category name (will be resolved to ID later)
  basePrice: number; // taxable rate
  taxPercent: number;
  grossRate: number;
  promoPrice?: number; // taxable promo single unit
  promoStartTime?: string;
  promoEndTime?: string;
  stock?: number;
  imageUrl?: string;
  imageName?: string;
  bulkSlabs: {
    minQty: number;
    grossRate: number;
    taxableRate: number;
    promoGrossRate?: number;
    promoTaxableRate?: number;
  }[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ProductImportResult {
  rows: ParsedProductRow[];
  errors: ImportError[];
}

export function parseProductImport(buffer: Buffer): ProductImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  // Try "Products" sheet first, fallback to first sheet
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'products') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

  const rows: ParsedProductRow[] = [];
  const errors: ImportError[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // +2 for header row + 0-index
    const cleaned = cleanRow(raw);
    const result = productImportRowSchema.safeParse(cleaned);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
      return;
    }

    const r = result.data;
    const taxPercent = r['Tax %'] ?? 0;
    const taxableRate = r['Taxable Rate (Amt)'];
    const grossRate = r['Gross Rate 1Pc (visible to the Customer)'] ?? toGross(taxableRate, taxPercent);

    // Parse promo single unit (gross) → convert to taxable
    let promoPrice: number | undefined;
    const promoGross = r['6pm to 9am Promo Rate - Single Unit'];
    if (promoGross && promoGross > 0) {
      promoPrice = toTaxable(promoGross, taxPercent);
    }

    // Parse bulk slabs
    const bulkSlabs: ParsedProductRow['bulkSlabs'] = [];

    // Slab 1
    const s1Qty = r['Bulk Rates 1 - Qty'];
    const s1Gross = r['Bulk Rates 1 - Gross Rate / Unit'];
    if (s1Qty && s1Gross) {
      const slab1: ParsedProductRow['bulkSlabs'][0] = {
        minQty: s1Qty,
        grossRate: s1Gross,
        taxableRate: toTaxable(s1Gross, taxPercent),
      };
      // Promo for slab 1
      const ps1Qty = r['6pm to 9am Bulk Rates 1 - Qty'];
      const ps1Gross = r['6pm to 9am Bulk Rates 1 - Unit'];
      if (ps1Qty && ps1Gross && ps1Qty === s1Qty) {
        slab1.promoGrossRate = ps1Gross;
        slab1.promoTaxableRate = toTaxable(ps1Gross, taxPercent);
      }
      bulkSlabs.push(slab1);
    }

    // Slab 2
    const s2Qty = r['Bulk Rates 2 - Qty'];
    const s2Gross = r['Bulk Rates 2 - Gross Rate / Unit'];
    if (s2Qty && s2Gross) {
      const slab2: ParsedProductRow['bulkSlabs'][0] = {
        minQty: s2Qty,
        grossRate: s2Gross,
        taxableRate: toTaxable(s2Gross, taxPercent),
      };
      // Promo for slab 2
      const ps2Qty = r['6pm to 9am Bulk Rates 2 - Qty'];
      const ps2Gross = r['6pm to 9am Bulk Rates 2 - Gross Rate / Unit'];
      if (ps2Qty && ps2Gross && ps2Qty === s2Qty) {
        slab2.promoGrossRate = ps2Gross;
        slab2.promoTaxableRate = toTaxable(ps2Gross, taxPercent);
      }
      bulkSlabs.push(slab2);
    }

    rows.push({
      sku: r['SKU'],
      name: r['Product Name'],
      hsn: r['HSN'],
      unit: r['Unit'],
      brand: r['Brand'],
      category: r['Category'],
      basePrice: taxableRate,
      taxPercent,
      grossRate,
      promoPrice,
      promoStartTime: promoPrice ? '18:00' : undefined,
      promoEndTime: promoPrice ? '09:00' : undefined,
      stock: r['Available Stock'],
      imageUrl: r['product image url'],
      imageName: r['Image Name'],
      bulkSlabs,
    });
  });

  return { rows, errors };
}

// ══════════════════════════════════════════════════════════════════════════════
// Product Export
// ══════════════════════════════════════════════════════════════════════════════

export interface ProductExportRow {
  name: string;
  sku?: string | null;
  hsn?: string | null;
  unit?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  basePrice: number; // taxable rate
  taxPercent: number;
  promoPrice?: number | null; // taxable promo single unit
  imageUrl?: string | null;
  imageName?: string | null;
  stock?: number;
  approvalStatus?: string;
  // Price slabs (up to 2)
  priceSlabs?: {
    minQty: number;
    price: number; // taxable rate
    promoPrice?: number | null; // taxable promo rate
  }[];
}

export function exportProductsToXlsx(
  products: ProductExportRow[],
  categories?: CategoryExportRow[],
): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Products sheet ──
  const productData = products.map(p => {
    const tax = p.taxPercent || 0;
    const slab1 = p.priceSlabs?.[0];
    const slab2 = p.priceSlabs?.[1];

    return {
      'SKU': p.sku || '',
      'Product Name': p.name,
      'HSN': p.hsn || '',
      'Unit': p.unit || '',
      'Brand': p.brand || '',
      'Category': p.categoryName || '',
      'Taxable Rate (Amt)': Number(p.basePrice),
      'Tax %': `${tax}%`,
      'Gross Rate 1Pc (visible to the Customer)': toGross(Number(p.basePrice), tax),
      'Bulk Rates 1 - Qty': slab1?.minQty ?? '',
      'Bulk Rates 1 - Gross Rate / Unit': slab1 ? toGross(Number(slab1.price), tax) : '',
      'Bulk Rates 2 - Qty': slab2?.minQty ?? '',
      'Bulk Rates 2 - Gross Rate / Unit': slab2 ? toGross(Number(slab2.price), tax) : '',
      '6pm to 9am Promo Rate - Single Unit': p.promoPrice ? toGross(Number(p.promoPrice), tax) : '',
      '6pm to 9am Bulk Rates 1 - Qty': slab1?.promoPrice ? slab1.minQty : '',
      '6pm to 9am Bulk Rates 1 - Unit': slab1?.promoPrice ? toGross(Number(slab1.promoPrice), tax) : '',
      '6pm to 9am Bulk Rates 2 - Qty': slab2?.promoPrice ? slab2.minQty : '',
      '6pm to 9am Bulk Rates 2 - Gross Rate / Unit': slab2?.promoPrice ? toGross(Number(slab2.promoPrice), tax) : '',
      'Available Stock': p.stock ?? 0,
      'product image url': p.imageUrl || '',
      'Image Name': p.imageName || '',
    };
  });

  const pws = XLSX.utils.json_to_sheet(productData);
  // Column widths
  const pHeaders = Object.keys(productData[0] || {});
  pws['!cols'] = pHeaders.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  XLSX.utils.book_append_sheet(wb, pws, 'Products');

  // ── Categories sheet (if provided) ──
  if (categories && categories.length > 0) {
    const catData = categories.map(c => ({
      'Name': c.name,
      'Slug': c.slug,
      'Parent': c.parentName || '',
      'Image URL': c.imageUrl || '',
      'Sort Order': c.sortOrder,
      'Active': c.isActive ? 'Yes' : 'No',
      'Status': c.approvalStatus,
      'Products': c.productCount ?? 0,
    }));
    const cws = XLSX.utils.json_to_sheet(catData);
    cws['!cols'] = Object.keys(catData[0] || {}).map(h => ({ wch: Math.max(h.length + 2, 12) }));
    XLSX.utils.book_append_sheet(wb, cws, 'Categories');
  }

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function exportProductsToCsv(products: ProductExportRow[]): string {
  const data = products.map(p => {
    const tax = p.taxPercent || 0;
    const slab1 = p.priceSlabs?.[0];
    const slab2 = p.priceSlabs?.[1];

    return {
      'SKU': p.sku || '',
      'Product Name': p.name,
      'HSN': p.hsn || '',
      'Unit': p.unit || '',
      'Brand': p.brand || '',
      'Category': p.categoryName || '',
      'Taxable Rate (Amt)': Number(p.basePrice),
      'Tax %': `${tax}%`,
      'Gross Rate 1Pc': toGross(Number(p.basePrice), tax),
      'Bulk Rates 1 - Qty': slab1?.minQty ?? '',
      'Bulk Rates 1 - Gross Rate / Unit': slab1 ? toGross(Number(slab1.price), tax) : '',
      'Bulk Rates 2 - Qty': slab2?.minQty ?? '',
      'Bulk Rates 2 - Gross Rate / Unit': slab2 ? toGross(Number(slab2.price), tax) : '',
      'Promo Rate': p.promoPrice ? toGross(Number(p.promoPrice), tax) : '',
      'Available Stock': p.stock ?? 0,
      'Image URL': p.imageUrl || '',
      'Image Name': p.imageName || '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return XLSX.utils.sheet_to_csv(ws);
}

// Generate a template XLSX with headers, sample row, and Categories sheet
export function generateImportTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const sampleRow = {
    'SKU': 'Z0001',
    'Product Name': 'Sample Product 1Kg',
    'HSN': '04061000',
    'Unit': 'Pc',
    'Brand': 'BrandName',
    'Category': 'Dairy',
    'Taxable Rate (Amt)': 100,
    'Tax %': '5%',
    'Gross Rate 1Pc (visible to the Customer)': 105,
    'Bulk Rates 1 - Qty': 10,
    'Bulk Rates 1 - Gross Rate / Unit': 99.75,
    'Bulk Rates 2 - Qty': 25,
    'Bulk Rates 2 - Gross Rate / Unit': 94.50,
    '6pm to 9am Promo Rate - Single Unit': 95,
    '6pm to 9am Bulk Rates 1 - Qty': 10,
    '6pm to 9am Bulk Rates 1 - Unit': 90,
    '6pm to 9am Bulk Rates 2 - Qty': 25,
    '6pm to 9am Bulk Rates 2 - Gross Rate / Unit': 85,
    'Available Stock': 500,
    'product image url': '',
    'Image Name': 'Z0001.png',
  };

  const pws = XLSX.utils.json_to_sheet([sampleRow]);
  const headers = Object.keys(sampleRow);
  pws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 16) }));
  XLSX.utils.book_append_sheet(wb, pws, 'Products');

  // Categories sheet
  const catSample = { 'Name': 'Dairy' };
  const cws = XLSX.utils.json_to_sheet([catSample]);
  cws['!cols'] = [{ wch: 20 }];
  XLSX.utils.book_append_sheet(wb, cws, 'Categories');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ══════════════════════════════════════════════════════════════════════════════
// Category Import/Export (unchanged column format)
// ══════════════════════════════════════════════════════════════════════════════

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
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'categories') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
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

export interface CategoryExportRow {
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
