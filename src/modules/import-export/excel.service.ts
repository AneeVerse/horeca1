import * as XLSX from 'xlsx';
import { z } from 'zod';

// Product import supports two header families:
//   • Legacy 6to9 sheet (Product Name, Category, Taxable Rate, Bulk Rates …)
//   • Vendor_Item_Template / Zoho sheet (Item Name, Parent Category, Sub-Category,
//     Additional Sub-Category, Net Rate, Stock On Hand, Bulk Qty 1 …)

// ── Shared helpers ──

const INSTRUCTION_ROW_MARKERS = [
  'vendor provided',
  'choose one',
  'choose multiple',
  'system fetched',
  'system generated',
  'taxable rate; vendor provided',
];

function isInstructionRow(cleaned: Record<string, unknown>): boolean {
  const name = String(cleaned['Product Name'] ?? cleaned['Item Name'] ?? '').toLowerCase().trim();
  if (!name) return true;
  return INSTRUCTION_ROW_MARKERS.some((m) => name.includes(m));
}

function parseAdditionalSubCategories(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === '') return [];
  return String(raw)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function formatCategoryLabel(row: {
  parentCategory?: string;
  subCategory?: string;
  legacyCategory?: string;
  additionalSubCategories?: string[];
}): string | undefined {
  const parts: string[] = [];
  if (row.parentCategory && row.subCategory) {
    parts.push(`${row.parentCategory} > ${row.subCategory}`);
  } else if (row.subCategory) {
    parts.push(row.subCategory);
  } else if (row.legacyCategory) {
    parts.push(row.legacyCategory);
  } else if (row.parentCategory) {
    parts.push(row.parentCategory);
  }
  if (row.additionalSubCategories?.length) {
    parts.push(`+${row.additionalSubCategories.join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanRow(raw: Record<string, any>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  const numericKeys = [
    'Taxable Rate (Amt)',
    'Net Rate',
    'Tax %',
    'Intra State Tax Rate',
    'Inter State Tax Rate',
    'Gross Rate 1Pc (visible to the Customer)',
    'Bulk Rates 1 - Qty',
    'Bulk Rates 1 - Gross Rate / Unit',
    'Bulk Qty 1 - Quantity',
    'Bulk Qty 1 - Net Rate / Pc',
    'Bulk Rates 2 - Qty',
    'Bulk Rates 2 - Gross Rate / Unit',
    '6pm to 9am Promo Rate - Single Unit',
    '6pm to 9am Bulk Rates 1 - Qty',
    '6pm to 9am Bulk Rates 1 - Unit',
    '6pm to 9am Bulk Rates 2 - Qty',
    '6pm to 9am Bulk Rates 2 - Gross Rate / Unit',
    'Available Stock',
    'Stock On Hand',
    'MOQ',
    'sortOrder',
    'Platform Commission',
    'Reorder Point',
    'Opening Stock',
    'Package Weight',
    'Package Length',
    'Package Width',
    'Package Height',
  ];

  for (const [key, val] of Object.entries(raw)) {
    // Normalize the header to the canonical schema key: match case-insensitively
    // and resolve known aliases. Without this, a CSV that says "Image URL"
    // (the CSV export header) never reaches the schema's "product image url"
    // key, so the column is silently dropped on import.
    const trimmedKey = key.trim();
    const k = HEADER_MAP[trimmedKey.toLowerCase()] ?? trimmedKey;
    let v = typeof val === 'string' ? val.trim() : val;

    if (numericKeys.includes(k) && typeof v === 'string') {
      const stripped = v.replace(/[₹$,%]/g, '').trim();
      if (stripped === '') {
        v = undefined;
      } else {
        const num = Number(stripped);
        if (!isNaN(num)) {
          v = num;
        }
      }
    }

    cleaned[k] = v;
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

// Schema accepts legacy + Vendor_Item_Template (Zoho) column headers
const productImportRowSchema = z
  .object({
    'SKU': z.coerce.string().optional(),
    'Product Name': z.coerce.string().optional(),
    'Item Name': z.coerce.string().optional(),
    'HSN': z.coerce.string().optional(),
    'HSN Code': z.coerce.string().optional(),
    'Unit': z.coerce.string().optional(),
    'Usage unit': z.coerce.string().optional(),
    'Unit Name': z.coerce.string().optional(),
    'Brand': z.coerce.string().optional(),
    'Category': z.coerce.string().optional(),
    'Parent Category': z.coerce.string().optional(),
    'Sub-Category': z.coerce.string().optional(),
    'Additional Sub-Category': z.coerce.string().optional(),
    'Taxable Rate (Amt)': z.coerce.number().positive().optional(),
    'Net Rate': z.coerce.number().positive().optional(),
    'Tax %': z.coerce.number().min(0).max(100).optional(),
    'Intra State Tax Rate': z.coerce.number().min(0).max(100).optional(),
    'Inter State Tax Rate': z.coerce.number().min(0).max(100).optional(),
    'Gross Rate 1Pc (visible to the Customer)': z.coerce.number().optional(),
    'Bulk Rates 1 - Qty': z.coerce.number().int().min(1).optional(),
    'Bulk Rates 1 - Gross Rate / Unit': z.coerce.number().positive().optional(),
    'Bulk Qty 1 - Quantity': z.coerce.number().int().min(1).optional(),
    'Bulk Qty 1 - Net Rate / Pc': z.coerce.number().positive().optional(),
    'Bulk Rates 2 - Qty': z.coerce.number().int().min(1).optional(),
    'Bulk Rates 2 - Gross Rate / Unit': z.coerce.number().positive().optional(),
    '6pm to 9am Promo Rate - Single Unit': z.coerce.number().positive().optional(),
    '6pm to 9am Bulk Rates 1 - Qty': z.coerce.number().int().min(1).optional(),
    '6pm to 9am Bulk Rates 1 - Unit': z.coerce.number().positive().optional(),
    '6pm to 9am Bulk Rates 2 - Qty': z.coerce.number().int().min(1).optional(),
    '6pm to 9am Bulk Rates 2 - Gross Rate / Unit': z.coerce.number().positive().optional(),
    'Available Stock': z.coerce.number().optional(),
    'Stock On Hand': z.coerce.number().optional(),
    'product image url': z.coerce.string().optional(),
    'Image URL': z.coerce.string().optional(),
    'Image Name': z.coerce.string().optional(),
    'Alias Name': z.coerce.string().optional(),
    'UPC': z.coerce.string().optional(),
    'Veg / Non-Veg': z.coerce.string().optional(),
    'Storage type': z.coerce.string().optional(),
    'MOQ': z.coerce.number().int().min(1).optional(),
    // Zoho and other metadata fields
    'Account': z.coerce.string().optional(),
    'Account Code': z.coerce.string().optional(),
    'Taxable': z.coerce.string().optional().or(z.coerce.boolean()),
    'Exemption Reason': z.coerce.string().optional(),
    'Taxability Type': z.coerce.string().optional(),
    'Product Type': z.coerce.string().optional(),
    'Intra State Tax Name': z.coerce.string().optional(),
    'Intra State Tax Type': z.coerce.string().optional(),
    'Inter State Tax Name': z.coerce.string().optional(),
    'Inter State Tax Type': z.coerce.string().optional(),
    'Source': z.coerce.string().optional(),
    'Reference ID': z.coerce.string().optional(),
    'Last Sync': z.coerce.string().optional(),
    'Inventory Account': z.coerce.string().optional(),
    'Inventory Account Code': z.coerce.string().optional(),
    'Valuation Method': z.coerce.string().optional(),
    'Reorder Point': z.coerce.number().optional(),
    'Opening Stock': z.coerce.number().optional(),
    'Item Type': z.coerce.string().optional(),
    'Sellable': z.coerce.string().optional().or(z.coerce.boolean()),
    'Purchasable': z.coerce.string().optional().or(z.coerce.boolean()),
    'Track Inventory': z.coerce.string().optional().or(z.coerce.boolean()),
    'Package Weight': z.coerce.number().optional(),
    'Package Length': z.coerce.number().optional(),
    'Package Width': z.coerce.number().optional(),
    'Package Height': z.coerce.number().optional(),
    'Dimension Unit': z.coerce.string().optional(),
    'Weight Unit': z.coerce.string().optional(),
    'EAN': z.coerce.string().optional(),
    'ISBN': z.coerce.string().optional(),
    'Variant Mapping': z.coerce.string().optional(),
    'Platform Commission': z.coerce.number().optional(),
    'Item Status': z.coerce.string().optional(),
    'Active on Online Store': z.coerce.string().optional().or(z.coerce.boolean()),
  })
  .superRefine((data, ctx) => {
    const name = (data['Product Name'] || data['Item Name'] || '').trim();
    if (!name) {
      ctx.addIssue({
        code: 'custom',
        message: 'Product Name is required',
        path: ['Product Name'],
      });
    }
    const taxableRate = data['Taxable Rate (Amt)'] ?? data['Net Rate'];
    if (taxableRate === undefined || taxableRate <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Taxable Rate must be > 0',
        path: ['Taxable Rate (Amt)'],
      });
    }
  });

export type RawImportRow = z.infer<typeof productImportRowSchema>;

// Lowercased header → canonical schema key. Built from the schema's own keys
// (so any casing variant resolves) plus explicit aliases for headers that drift
// between the CSV export, the XLSX export, and hand-edited sheets. This is what
// makes the importer resilient regardless of which export produced the file.
const HEADER_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const key of Object.keys(productImportRowSchema.shape)) {
    map[key.toLowerCase()] = key;
  }
  const aliases: Record<string, string> = {
    'item name': 'Item Name',
    'hsn code': 'HSN Code',
    'product image url': 'Image URL',
    'image url': 'Image URL',
    'image_url': 'Image URL',
    'net rate': 'Net Rate',
    'stock on hand': 'Stock On Hand',
    'usage unit': 'Usage unit',
    'unit name': 'Unit Name',
    'intra state tax rate': 'Intra State Tax Rate',
    'inter state tax rate': 'Inter State Tax Rate',
    'bulk qty 1 - quantity': 'Bulk Qty 1 - Quantity',
    'bulk qty 1 - net rate / pc': 'Bulk Qty 1 - Net Rate / Pc',
    'additional sub-category': 'Additional Sub-Category',
    'additional sub category': 'Additional Sub-Category',
    'sub-category': 'Sub-Category',
    'sub category': 'Sub-Category',
    'parent category': 'Parent Category',
    'gross rate 1pc': 'Gross Rate 1Pc (visible to the Customer)',
    'promo rate': '6pm to 9am Promo Rate - Single Unit',
    'veg / non-veg': 'Veg / Non-Veg',
    'storage type': 'Storage type',
  };
  for (const [alias, canonical] of Object.entries(aliases)) {
    map[alias] = canonical;
  }
  return map;
})();

// Normalized row after parsing — flat fields + bulk slabs + hierarchical categories
export interface ParsedProductRow {
  sku?: string;
  name: string;
  hsn?: string;
  unit?: string;
  brand?: string;
  /** Primary category label for preview UI (Parent > Sub, legacy Category, etc.) */
  category?: string;
  /** Flat Category column from legacy import sheets */
  legacyCategory?: string;
  parentCategory?: string;
  subCategory?: string;
  additionalSubCategories?: string[];
  basePrice: number; // taxable rate
  taxPercent: number;
  grossRate: number;
  promoPrice?: number; // taxable promo single unit
  promoStartTime?: string;
  promoEndTime?: string;
  stock?: number;
  imageUrl?: string;
  imageName?: string;
  aliasName?: string;
  upc?: string;
  vegNonVeg?: string;
  storageType?: string;
  moq?: number;
  bulkSlabs: {
    minQty: number;
    grossRate: number;
    taxableRate: number;
    promoGrossRate?: number;
    promoTaxableRate?: number;
  }[];
  metadata?: Record<string, any>;
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

  // Prefer a Products sheet; skip the Categories reference sheet when present.
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === 'products') ||
    wb.SheetNames.find((n) => n.toLowerCase() !== 'categories') ||
    wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

  const rows: ParsedProductRow[] = [];
  const errors: ImportError[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // +2 for header row + 0-index
    const cleaned = cleanRow(raw);

    if (isInstructionRow(cleaned)) return;

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
    const name = (r['Product Name'] || r['Item Name'] || '').trim();
    const taxPercent = r['Tax %'] ?? r['Intra State Tax Rate'] ?? r['Inter State Tax Rate'] ?? 0;
    const taxableRate = (r['Taxable Rate (Amt)'] ?? r['Net Rate'])!;
    const grossRate = r['Gross Rate 1Pc (visible to the Customer)'] ?? toGross(taxableRate, taxPercent);

    const parentCategory = r['Parent Category']?.trim() || undefined;
    const subCategory = r['Sub-Category']?.trim() || undefined;
    const legacyCategory = r['Category']?.trim() || undefined;
    const additionalSubCategories = parseAdditionalSubCategories(r['Additional Sub-Category']);

    // Parse promo single unit (gross) → convert to taxable
    let promoPrice: number | undefined;
    const promoGross = r['6pm to 9am Promo Rate - Single Unit'];
    if (promoGross && promoGross > 0) {
      promoPrice = toTaxable(promoGross, taxPercent);
    }

    // Parse bulk slabs (legacy gross columns + Zoho net-rate columns)
    const bulkSlabs: ParsedProductRow['bulkSlabs'] = [];

    const s1Qty = r['Bulk Rates 1 - Qty'] ?? r['Bulk Qty 1 - Quantity'];
    const s1Gross = r['Bulk Rates 1 - Gross Rate / Unit'];
    const s1Net = r['Bulk Qty 1 - Net Rate / Pc'];
    if (s1Qty && (s1Gross || s1Net)) {
      const slab1: ParsedProductRow['bulkSlabs'][0] = s1Gross
        ? {
            minQty: s1Qty,
            grossRate: s1Gross,
            taxableRate: toTaxable(s1Gross, taxPercent),
          }
        : {
            minQty: s1Qty,
            taxableRate: s1Net!,
            grossRate: toGross(s1Net!, taxPercent),
          };
      const ps1Qty = r['6pm to 9am Bulk Rates 1 - Qty'];
      const ps1Gross = r['6pm to 9am Bulk Rates 1 - Unit'];
      if (ps1Qty && ps1Gross && ps1Qty === s1Qty) {
        slab1.promoGrossRate = ps1Gross;
        slab1.promoTaxableRate = toTaxable(ps1Gross, taxPercent);
      }
      bulkSlabs.push(slab1);
    }

    const s2Qty = r['Bulk Rates 2 - Qty'];
    const s2Gross = r['Bulk Rates 2 - Gross Rate / Unit'];
    if (s2Qty && s2Gross) {
      const slab2: ParsedProductRow['bulkSlabs'][0] = {
        minQty: s2Qty,
        grossRate: s2Gross,
        taxableRate: toTaxable(s2Gross, taxPercent),
      };
      const ps2Qty = r['6pm to 9am Bulk Rates 2 - Qty'];
      const ps2Gross = r['6pm to 9am Bulk Rates 2 - Gross Rate / Unit'];
      if (ps2Qty && ps2Gross && ps2Qty === s2Qty) {
        slab2.promoGrossRate = ps2Gross;
        slab2.promoTaxableRate = toTaxable(ps2Gross, taxPercent);
      }
      bulkSlabs.push(slab2);
    }

    const parsedRow: ParsedProductRow = {
      sku: r['SKU'],
      name,
      hsn: r['HSN'] || r['HSN Code'],
      unit: r['Unit'] || r['Usage unit'] || r['Unit Name'],
      brand: r['Brand'],
      parentCategory,
      subCategory,
      additionalSubCategories: additionalSubCategories.length > 0 ? additionalSubCategories : undefined,
      legacyCategory,
      basePrice: taxableRate,
      taxPercent,
      grossRate,
      promoPrice,
      promoStartTime: promoPrice ? '18:00' : undefined,
      promoEndTime: promoPrice ? '09:00' : undefined,
      stock: (() => {
        const raw = r['Available Stock'] ?? r['Stock On Hand'];
        if (raw === undefined) return undefined;
        return Math.max(0, Math.trunc(raw));
      })(),
      imageUrl: r['Image URL'] || r['product image url'],
      imageName: r['Image Name'],
      aliasName: r['Alias Name'],
      upc: r['UPC'],
      vegNonVeg: r['Veg / Non-Veg'],
      storageType: r['Storage type'],
      moq: r['MOQ'],
      bulkSlabs,
      metadata: {
        accounting: {
          account: r['Account'],
          accountCode: r['Account Code'],
          taxable: r['Taxable'],
          exemptionReason: r['Exemption Reason'],
          taxabilityType: r['Taxability Type'],
          intraStateTaxName: r['Intra State Tax Name'],
          intraStateTaxRate: r['Intra State Tax Rate'],
          intraStateTaxType: r['Intra State Tax Type'],
          interStateTaxName: r['Inter State Tax Name'],
          interStateTaxRate: r['Inter State Tax Rate'],
          interStateTaxType: r['Inter State Tax Type'],
          inventoryAccount: r['Inventory Account'],
          inventoryAccountCode: r['Inventory Account Code'],
          platformCommission: r['Platform Commission'],
        },
        inventory: {
          reorderPoint: r['Reorder Point'],
          openingStock: r['Opening Stock'],
          valuationMethod: r['Valuation Method'],
          trackInventory: r['Track Inventory'],
        },
        packaging: {
          packageWeight: r['Package Weight'],
          packageLength: r['Package Length'],
          packageWidth: r['Package Width'],
          packageHeight: r['Package Height'],
          dimensionUnit: r['Dimension Unit'],
          weightUnit: r['Weight Unit'],
        },
        identifiers: {
          ean: r['EAN'],
          isbn: r['ISBN'],
        },
        attributes: {
          itemType: r['Item Type'],
          productType: r['Product Type'],
          source: r['Source'],
          referenceId: r['Reference ID'],
          lastSync: r['Last Sync'],
          sellable: r['Sellable'],
          purchasable: r['Purchasable'],
          variantMapping: r['Variant Mapping'],
          itemStatus: r['Item Status'],
          activeOnlineStore: r['Active on Online Store'],
        }
      }
    };
    parsedRow.category = formatCategoryLabel(parsedRow) ?? legacyCategory;
    rows.push(parsedRow);
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
  metadata?: any;
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

    const meta = (p.metadata && typeof p.metadata === 'object' ? p.metadata : {}) as Record<string, any>;
    const acc = meta.accounting || {};
    const inv = meta.inventory || {};
    const pkg = meta.packaging || {};
    const ids = meta.identifiers || {};
    const att = meta.attributes || {};

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
      // Zoho/metadata fields
      'Account': acc.account || '',
      'Account Code': acc.accountCode || '',
      'Taxable': acc.taxable ?? '',
      'Exemption Reason': acc.exemptionReason || '',
      'Taxability Type': acc.taxabilityType || '',
      'Product Type': att.productType || '',
      'Intra State Tax Name': acc.intraStateTaxName || '',
      'Intra State Tax Rate': acc.intraStateTaxRate ?? '',
      'Intra State Tax Type': acc.intraStateTaxType || '',
      'Inter State Tax Name': acc.interStateTaxName || '',
      'Inter State Tax Rate': acc.interStateTaxRate ?? '',
      'Inter State Tax Type': acc.interStateTaxType || '',
      'Source': att.source || '',
      'Reference ID': att.referenceId || '',
      'Last Sync': att.lastSync || '',
      'Inventory Account': acc.inventoryAccount || '',
      'Inventory Account Code': acc.inventoryAccountCode || '',
      'Valuation Method': inv.valuationMethod || '',
      'Reorder Point': inv.reorderPoint ?? '',
      'Opening Stock': inv.openingStock ?? '',
      'Item Type': att.itemType || '',
      'Sellable': att.sellable ?? '',
      'Purchasable': att.purchasable ?? '',
      'Track Inventory': inv.trackInventory ?? '',
      'Package Weight': pkg.packageWeight ?? '',
      'Package Length': pkg.packageLength ?? '',
      'Package Width': pkg.packageWidth ?? '',
      'Package Height': pkg.packageHeight ?? '',
      'Dimension Unit': pkg.dimensionUnit || '',
      'Weight Unit': pkg.weightUnit || '',
      'EAN': ids.ean || '',
      'ISBN': ids.isbn || '',
      'Variant Mapping': att.variantMapping || '',
      'Platform Commission': acc.platformCommission ?? '',
      'Item Status': att.itemStatus || '',
      'Active on Online Store': att.activeOnlineStore ?? '',
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

    const meta = (p.metadata && typeof p.metadata === 'object' ? p.metadata : {}) as Record<string, any>;
    const acc = meta.accounting || {};
    const inv = meta.inventory || {};
    const pkg = meta.packaging || {};
    const ids = meta.identifiers || {};
    const att = meta.attributes || {};

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
      'Available Stock': p.stock ?? 0,
      'product image url': p.imageUrl || '',
      'Image Name': p.imageName || '',
      // Zoho/metadata fields
      'Account': acc.account || '',
      'Account Code': acc.accountCode || '',
      'Taxable': acc.taxable ?? '',
      'Exemption Reason': acc.exemptionReason || '',
      'Taxability Type': acc.taxabilityType || '',
      'Product Type': att.productType || '',
      'Intra State Tax Name': acc.intraStateTaxName || '',
      'Intra State Tax Rate': acc.intraStateTaxRate ?? '',
      'Intra State Tax Type': acc.intraStateTaxType || '',
      'Inter State Tax Name': acc.interStateTaxName || '',
      'Inter State Tax Rate': acc.interStateTaxRate ?? '',
      'Inter State Tax Type': acc.interStateTaxType || '',
      'Source': att.source || '',
      'Reference ID': att.referenceId || '',
      'Last Sync': att.lastSync || '',
      'Inventory Account': acc.inventoryAccount || '',
      'Inventory Account Code': acc.inventoryAccountCode || '',
      'Valuation Method': inv.valuationMethod || '',
      'Reorder Point': inv.reorderPoint ?? '',
      'Opening Stock': inv.openingStock ?? '',
      'Item Type': att.itemType || '',
      'Sellable': att.sellable ?? '',
      'Purchasable': att.purchasable ?? '',
      'Track Inventory': inv.trackInventory ?? '',
      'Package Weight': pkg.packageWeight ?? '',
      'Package Length': pkg.packageLength ?? '',
      'Package Width': pkg.packageWidth ?? '',
      'Package Height': pkg.packageHeight ?? '',
      'Dimension Unit': pkg.dimensionUnit || '',
      'Weight Unit': pkg.weightUnit || '',
      'EAN': ids.ean || '',
      'ISBN': ids.isbn || '',
      'Variant Mapping': att.variantMapping || '',
      'Platform Commission': acc.platformCommission ?? '',
      'Item Status': att.itemStatus || '',
      'Active on Online Store': att.activeOnlineStore ?? '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return XLSX.utils.sheet_to_csv(ws);
}

// Generate a template XLSX aligned with Vendor_Item_Template.xlsx (Zoho-style)
export function generateImportTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  // Full column set = every header the parser accepts (derived from the Zod
  // schema so it never drifts), with two system/export-only columns first.
  const headers: string[] = [
    'Vendor ID',
    'Item ID',
    ...Object.keys(productImportRowSchema.shape),
  ];

  // Sensible sample values for the common fields; everything else blank so a
  // downloaded template round-trips cleanly on import.
  const sampleValues: Record<string, string | number> = {
    'Item Name': 'Sample Product 1 Kg',
    'SKU': 'Z0001',
    'HSN Code': '04061000',
    'Brand': 'BrandName',
    'Parent Category': 'Dairy',
    'Sub-Category': 'Milk',
    'Net Rate': 100,
    'Intra State Tax Rate': 5,
    'Usage unit': 'Pc',
    'Stock On Hand': 500,
    'MOQ': 1,
    'Bulk Qty 1 - Quantity': 10,
    'Bulk Qty 1 - Net Rate / Pc': 95,
    'Veg / Non-Veg': 'Veg',
    'Storage type': 'Ambient',
  };

  const sampleRow: Record<string, string | number> = {};
  for (const h of headers) sampleRow[h] = sampleValues[h] ?? '';

  const pws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  pws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 16) }));
  XLSX.utils.book_append_sheet(wb, pws, 'Products');

  // Categories reference — Parent / Sub-Category pairs for the hierarchy picker
  const catRows = [
    { 'Parent Category': 'Dairy', 'Sub-Category': 'Milk' },
    { 'Parent Category': 'Dairy', 'Sub-Category': 'Cheese' },
    { 'Parent Category': 'Bakery & Desserts', 'Sub-Category': 'Flour & Atta' },
  ];
  const cws = XLSX.utils.json_to_sheet(catRows);
  cws['!cols'] = [
    { wch: 24 },
    { wch: 24 },
  ];
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

// ══════════════════════════════════════════════════════════════════════════════
// Customer Import
// ══════════════════════════════════════════════════════════════════════════════

const customerImportRowSchema = z.object({
  'Name': z.string().min(1, 'Name is required'),
  'Phone': z.coerce.string().min(5, 'Phone must be at least 5 characters'),
  'Email': z.string().email('Invalid email address').optional(),
  'Business Name': z.string().min(1, 'Business Name is required'),
  'Trade Name': z.string().optional(),
  'GSTIN': z.string().optional(),
  'PAN': z.string().optional(),
  'FSSAI': z.string().optional(),
  'Billing Address': z.string().optional(),
  'Billing City': z.string().optional(),
  'Billing State': z.string().optional(),
  'Billing Pincode': z.coerce.string().optional(),
  'Delivery Address': z.string().min(1, 'Delivery Address is required'),
  'Delivery Pincode': z.coerce.string().min(1, 'Delivery Pincode is required'),
  'Territory': z.string().optional(),
  'Sales Executive': z.string().optional(),
  'Tags': z.string().optional(),
  // P0-4: customer master-datasheet attributes.
  'Business Type': z.string().optional(),
  'Sub-Type': z.string().optional(),
  'Cuisine': z.string().optional(),
  'Business Size': z.string().optional(),
  'Business Structure': z.string().optional(),
  'Service Model': z.string().optional(),
  'Monthly Purchase Band': z.string().optional(),
  'Procurement Frequency': z.string().optional(),
  'Designation': z.string().optional(),
  'Lead Status': z.string().optional(),
  'Credit Type': z.string().optional(),
  'AI Tags': z.string().optional(),
  'Behaviour Tags': z.string().optional(),
});

export interface ParsedCustomerRow {
  name: string;
  phone: string;
  email?: string;
  businessName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  fssai?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  deliveryAddress: string;
  deliveryPincode: string;
  territory?: string;
  salesExecutive?: string;
  tags?: string[];
  businessType?: string;
  subType?: string;
  cuisine?: string;
  businessSize?: string;
  businessStructure?: string;
  serviceModel?: string;
  monthlyPurchaseBand?: string;
  procurementFrequency?: string;
  designation?: string;
  leadStatus?: string;
  creditType?: string;
  aiTags?: string[];
  behaviourTags?: string[];
}

export interface CustomerImportResult {
  rows: ParsedCustomerRow[];
  errors: ImportError[];
}

export function parseCustomerImport(buffer: Buffer): CustomerImportResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'customers') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

  const rows: ParsedCustomerRow[] = [];
  const errors: ImportError[] = [];

  rawRows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const cleaned = cleanRow(raw);
    const result = customerImportRowSchema.safeParse(cleaned);

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
    const splitTags = (v?: string): string[] =>
      v ? v.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0) : [];

    rows.push({
      name: r['Name'],
      phone: String(r['Phone']),
      email: r['Email'],
      businessName: r['Business Name'],
      tradeName: r['Trade Name'],
      gstin: r['GSTIN'],
      pan: r['PAN'],
      fssai: r['FSSAI'],
      billingAddress: r['Billing Address'],
      billingCity: r['Billing City'],
      billingState: r['Billing State'],
      billingPincode: r['Billing Pincode'] ? String(r['Billing Pincode']) : undefined,
      deliveryAddress: r['Delivery Address'],
      deliveryPincode: String(r['Delivery Pincode']),
      territory: r['Territory'],
      salesExecutive: r['Sales Executive'],
      tags: splitTags(r['Tags']),
      businessType: r['Business Type'],
      subType: r['Sub-Type'],
      cuisine: r['Cuisine'],
      businessSize: r['Business Size'],
      businessStructure: r['Business Structure'],
      serviceModel: r['Service Model'],
      monthlyPurchaseBand: r['Monthly Purchase Band'],
      procurementFrequency: r['Procurement Frequency'],
      designation: r['Designation'],
      leadStatus: r['Lead Status'],
      creditType: r['Credit Type'],
      aiTags: splitTags(r['AI Tags']),
      behaviourTags: splitTags(r['Behaviour Tags']),
    });
  });

  return { rows, errors };
}
