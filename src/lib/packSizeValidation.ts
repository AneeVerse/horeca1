/** Pack size / container validation for brand master products. */

const QUANTITY_TOKENS = new Set([
  'kg', 'g', 'gm', 'gms', 'gram', 'grams', 'kilogram', 'kilograms',
  'l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters', 'ml', 'mls',
]);

const CONTAINER_TOKENS = new Set([
  'bottle', 'btl', 'pack', 'pcs', 'pc', 'piece', 'pieces', 'box', 'bag', 'jar',
  'pouch', 'sachet', 'can', 'tin', 'unit', 'carton', 'case',
]);

export function looksLikeQuantityToken(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (QUANTITY_TOKENS.has(v)) return true;
  return /^\d+(\.\d+)?\s*(kg|g|gm|ml|l|ltr|litre|liter)$/i.test(v);
}

export function looksLikeContainerToken(value: string): boolean {
  const v = value.trim().toLowerCase();
  return CONTAINER_TOKENS.has(v);
}

/** Returns an error message when pack/unit fields look swapped or invalid. */
export function validatePackUnitFields(packSize: string, unit: string): string | null {
  const ps = packSize.trim();
  const u = unit.trim();
  if (!ps && !u) return null;
  if (!ps && u && looksLikeQuantityToken(u)) {
    return 'Unit looks like a quantity (e.g. ltr, kg). Put that in Pack Size instead.';
  }
  if (ps && !u && looksLikeContainerToken(ps) && !looksLikeQuantityToken(ps)) {
    return 'Pack Size looks like a container (e.g. Bottle). Put quantity in Pack Size and container in Unit.';
  }
  if (ps && u && looksLikeContainerToken(ps) && looksLikeQuantityToken(u)) {
    return 'Pack Size and Unit may be swapped — quantity goes in Pack Size, container in Unit.';
  }
  return null;
}
