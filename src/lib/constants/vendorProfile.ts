/**
 * Vendor profile constants — seeded from Profile Mastersheet CSV attribute master (rows 72–83).
 * Single source for cascading Vendor Type → Sub-Type → Categories Handled dropdowns.
 */

export const BUSINESS_SIZES = ['Small', 'Medium', 'Large', 'Enterprise'] as const;

export const COVERAGE_OPTIONS = [
  'Local Area',
  'Local Market',
  'Citywide',
  'Mumbai',
  'Maharashtra',
  'Regional',
  'Gujarat',
  'Pan India',
  'National',
] as const;

export const MONTHLY_SUPPLY_BANDS = ['Low', 'Medium', 'High'] as const;

export const VENDOR_LEAD_STATUSES = ['Lead', 'Contacted', 'Active'] as const;

/** CSV-aligned vendor types (Level 2). Replaces legacy platform enum for new onboarding. */
export const VENDOR_BUSINESS_TYPES = [
  'Distributor',
  'Wholesaler',
  'Sub Distributor',
  'Importer',
  'Manufacturer',
  'Trader',
  'Packaging Supplier',
] as const;

export type VendorBusinessType = (typeof VENDOR_BUSINESS_TYPES)[number];

/** Sub-types keyed by vendor type (Level 3). */
export const SUB_TYPES_BY_TYPE: Record<string, readonly string[]> = {
  Distributor: ['HoReCa Distributor', 'Multi-Category Distributor', 'FMCG Distributor'],
  Wholesaler: ['Fruits & Vegetables', 'Dry Fruits & Spices', 'Frozen Foods'],
  'Sub Distributor': ['FMCG'],
  Importer: ['Specialty Foods'],
  Manufacturer: ['Sauces & Condiments', 'Bakery Ingredients'],
  Trader: ['Commodity Trader'],
  'Packaging Supplier': ['Food Packaging'],
};

/** Category presets keyed by "VendorType|SubType" (Level 4). */
export const CATEGORIES_BY_SUBTYPE: Record<string, readonly string[]> = {
  'Distributor|HoReCa Distributor': ['Foodservice Specialist', 'Frozen + Dairy', 'Frozen Foods'],
  'Distributor|Multi-Category Distributor': ['HoReCa + GT', 'Multi-Category'],
  'Distributor|FMCG Distributor': ['Modern Trade', 'GT + Modern Trade'],
  'Wholesaler|Fruits & Vegetables': ['Fresh Produce'],
  'Wholesaler|Dry Fruits & Spices': ['Bulk Trader', 'Dry Fruits', 'Spices'],
  'Wholesaler|Frozen Foods': ['Cold Chain', 'Frozen Foods'],
  'Sub Distributor|FMCG': ['Last Mile Distributor', 'FMCG'],
  'Importer|Specialty Foods': ['Japanese Imports', 'Seafood + Japanese', 'Specialty Foods'],
  'Manufacturer|Sauces & Condiments': ['Factory Direct', 'Sauces & Condiments'],
  'Manufacturer|Bakery Ingredients': ['Commercial Supply', 'Bakery + Desserts', 'Bakery Ingredients'],
  'Trader|Commodity Trader': ['Sugar/Flour', 'Commodity Trading'],
  'Packaging Supplier|Food Packaging': ['Disposable Products', 'Food Packaging'],
};

/** Legacy platform vendorType values → CSV-aligned VENDOR_BUSINESS_TYPES. */
export const LEGACY_VENDOR_TYPE_MAP: Record<string, VendorBusinessType | null> = {
  distributor: 'Distributor',
  wholesaler: 'Wholesaler',
  manufacturer: 'Manufacturer',
  brand_store: null,
  dark_store: null,
};

/** Slug values stored in Vendor.vendorType for new onboarding (CSV-aligned). */
export const VENDOR_TYPE_SLUGS: Record<VendorBusinessType, string> = {
  Distributor: 'distributor',
  Wholesaler: 'wholesaler',
  'Sub Distributor': 'sub_distributor',
  Importer: 'importer',
  Manufacturer: 'manufacturer',
  Trader: 'trader',
  'Packaging Supplier': 'packaging_supplier',
};

export function subTypesForVendorType(vendorType: string): readonly string[] {
  return SUB_TYPES_BY_TYPE[vendorType] ?? [];
}

export function categoriesForSubType(vendorType: string, subType: string): readonly string[] {
  return CATEGORIES_BY_SUBTYPE[`${vendorType}|${subType}`] ?? [];
}

export function slugForVendorType(vendorType: string): string | undefined {
  if (vendorType in VENDOR_TYPE_SLUGS) {
    return VENDOR_TYPE_SLUGS[vendorType as VendorBusinessType];
  }
  return undefined;
}
