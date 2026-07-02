import * as XLSX from 'xlsx';

export interface BrandImportRow {
  row: number;
  name: string;
  sku?: string;
  packSize?: string;
  unit?: string;
  parentCategory?: string;
  subCategory?: string;
  imageUrl?: string;
  aliasName?: string;
  hsn?: string;
}

const INSTRUCTION_MARKERS = [
  'vendor provided', 'choose one', 'system fetched', 'system generated', 'for search',
];

function isInstructionRow(name: string): boolean {
  const lower = name.toLowerCase();
  return INSTRUCTION_MARKERS.some((m) => lower.includes(m));
}

function cellStr(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return String(v).trim() || undefined;
}

export function parseBrandCatalogImport(buffer: Buffer): {
  rows: BrandImportRow[];
  errors: Array<{ row: number; message: string }>;
} {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames.includes('Brand Store') ? 'Brand Store' : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: BrandImportRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  raw.forEach((r, idx) => {
    const rowNum = idx + 2;
    const name = cellStr(r['Item Name']);
    if (!name || isInstructionRow(name)) return;

    if (!name) {
      errors.push({ row: rowNum, message: 'Item Name is required' });
      return;
    }

    rows.push({
      row: rowNum,
      name,
      sku: cellStr(r['SKU']),
      hsn: cellStr(r['HSN Code'] ?? r['HSN']),
      parentCategory: cellStr(r['Parent Category']),
      subCategory: cellStr(r['Sub-Category'] ?? r['Sub Category']),
      packSize: cellStr(r['Usage unit'] ?? r['Pack Size']),
      unit: cellStr(r['Unit Name'] ?? r['Unit']),
      imageUrl: cellStr(r['Image URL']),
      aliasName: cellStr(r['Alias Name']),
    });
  });

  return { rows, errors };
}

export function generateBrandCatalogTemplate(): Buffer {
  const headers = [
    'Item Name', 'SKU', 'HSN Code', 'Parent Category', 'Sub-Category',
    'Usage unit', 'Unit Name', 'Image URL', 'Alias Name',
  ];
  const hint = [
    'Vendor Provided', 'Vendor Provided', 'Vendor Provided', 'Choose One', 'Choose One',
    'e.g. 1 ltr', 'e.g. Bottle', 'URL', 'for search',
  ];
  const example = [
    'Manama Khus Syrup 1 Ltr', 'MAN-KHUS-1L', '210690', 'Beverages', 'Syrups',
    '1 ltr', 'Bottle', '', '',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, hint, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Brand Store');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export interface BrandExportRow {
  name: string;
  sku: string | null;
  packSize: string | null;
  unit: string | null;
  parentCategory: string;
  subCategory: string;
  imageUrl: string | null;
  description: string | null;
}

export function exportBrandCatalogToXlsx(products: BrandExportRow[]): Buffer {
  const headers = [
    'Item Name', 'SKU', 'HSN Code', 'Parent Category', 'Sub-Category',
    'Usage unit', 'Unit Name', 'Image URL', 'Alias Name',
  ];
  const data = products.map((p) => [
    p.name,
    p.sku ?? '',
    '',
    p.parentCategory,
    p.subCategory,
    p.packSize ?? '',
    p.unit ?? '',
    p.imageUrl ?? '',
    p.description ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Brand Store');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
