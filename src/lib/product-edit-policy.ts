/**
 * Product edit policy — material vs non-material field classification.
 * Material changes on approved listings queue as pending_edit; non-material apply live.
 */

export const MATERIAL_PRODUCT_FIELDS = [
  'brand',
  'name',
  'hsn',
  'packSize',
  'unit',
  'vegNonVeg',
  'masterProductId',
] as const;

export const NON_MATERIAL_PRODUCT_FIELDS = [
  'basePrice',
  'originalPrice',
  'taxPercent',
  'description',
  'aliasNames',
  'imageUrl',
  'images',
  'minOrderQty',
  'promoPrice',
  'promoStartTime',
  'promoEndTime',
  'storageType',
  'barcode',
  'tags',
  'fssaiRef',
  'shelfLifeDays',
  'countryOfOrigin',
  'creditEligible',
  'isFeatured',
] as const;

export type MaterialProductField = (typeof MATERIAL_PRODUCT_FIELDS)[number];
export type NonMaterialProductField = (typeof NON_MATERIAL_PRODUCT_FIELDS)[number];

/** Levenshtein distance — used for name typo escape hatch. */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Name-only typo: distance ≤ 30% of original length. */
export function isMinorNameChange(oldName: string, newName: string): boolean {
  const old = oldName.trim();
  const next = newName.trim();
  if (old === next) return true;
  if (!old || !next) return false;
  const dist = levenshteinDistance(old.toLowerCase(), next.toLowerCase());
  return dist <= Math.ceil(old.length * 0.3);
}

export interface PendingEditPayload {
  name?: string;
  brand?: string | null;
  hsn?: string | null;
  packSize?: string | null;
  unit?: string | null;
  vegNonVeg?: string | null;
  masterProductId?: string | null;
  categoryIds?: string[];
  submittedAt: string;
  submittedBy: string;
}

export function serializeFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  return JSON.stringify(value);
}

export interface MaterialChangeResult {
  materialPayload: Partial<PendingEditPayload>;
  hasMaterialChanges: boolean;
  nameIsMinorOnly: boolean;
}

type ProductSnapshot = {
  name: string;
  brand: string | null;
  hsn: string | null;
  packSize: string | null;
  unit: string | null;
  vegNonVeg: string | null;
  masterProductId: string | null;
  categoryId: string | null;
};

/**
 * Compare incoming update against current product + category set.
 * Returns material fields that should be queued (not applied live).
 */
export function detectMaterialChanges(
  current: ProductSnapshot,
  currentCategoryIds: string[],
  incoming: Record<string, unknown>,
  incomingCategoryIds?: string[],
): MaterialChangeResult {
  const materialPayload: Partial<PendingEditPayload> = {};
  let hasMaterialChanges = false;

  const compare = <K extends keyof ProductSnapshot>(field: K, incomingKey: string) => {
    if (incoming[incomingKey] === undefined) return;
    const next = incoming[incomingKey];
    const old = current[field];
    const oldStr = old === null || old === undefined ? '' : String(old);
    const nextStr = next === null || next === undefined ? '' : String(next);
    if (oldStr !== nextStr) {
      (materialPayload as Record<string, unknown>)[incomingKey] = next;
      hasMaterialChanges = true;
    }
  };

  compare('brand', 'brand');
  compare('name', 'name');
  compare('hsn', 'hsn');
  compare('packSize', 'packSize');
  compare('unit', 'unit');
  compare('vegNonVeg', 'vegNonVeg');
  compare('masterProductId', 'masterProductId');

  if (incomingCategoryIds !== undefined) {
    const sortedOld = [...currentCategoryIds].sort().join(',');
    const sortedNew = [...incomingCategoryIds].sort().join(',');
    if (sortedOld !== sortedNew) {
      materialPayload.categoryIds = incomingCategoryIds;
      hasMaterialChanges = true;
    }
  }

  const nameChanged = incoming.name !== undefined && String(incoming.name) !== current.name;
  const otherMaterial =
    hasMaterialChanges &&
    !(nameChanged && Object.keys(materialPayload).length === 1 && materialPayload.name !== undefined);

  const nameIsMinorOnly =
    nameChanged &&
    !otherMaterial &&
    isMinorNameChange(current.name, String(incoming.name));

  if (nameIsMinorOnly) {
    delete materialPayload.name;
    hasMaterialChanges = Object.keys(materialPayload).length > 0;
  }

  return { materialPayload, hasMaterialChanges, nameIsMinorOnly };
}

/** taxPercent is non-material unless HSN also changed in the same request. */
export function isTaxPercentMaterial(
  incoming: Record<string, unknown>,
  materialPayload: Partial<PendingEditPayload>,
): boolean {
  if (incoming.taxPercent === undefined) return false;
  return materialPayload.hsn !== undefined;
}
