/**
 * Flags BrandMasterProduct rows where pack_size looks like a unit label (legacy bug).
 * Run: npx tsx prisma/scripts/flag-brand-packsize-corruption.ts
 */
import { prisma } from '../../src/lib/prisma';

const UNIT_LIKE = new Set([
  'bottle', 'btl', 'pack', 'pcs', 'pc', 'piece', 'pieces', 'box', 'bag', 'jar',
  'pouch', 'sachet', 'can', 'tin', 'unit', 'kg', 'g', 'l', 'ltr', 'ml',
]);

async function main() {
  const rows = await prisma.brandMasterProduct.findMany({
    select: { id: true, name: true, packSize: true, unit: true, sku: true },
  });

  const suspicious = rows.filter((r) => {
    const ps = (r.packSize ?? '').trim().toLowerCase();
    if (!ps) return false;
    if (r.unit?.trim()) return false;
    return UNIT_LIKE.has(ps) || /^[a-z]+$/i.test(ps) && ps.length <= 12;
  });

  console.log(`Checked ${rows.length} brand master products`);
  console.log(`Suspicious pack_size (likely unit swapped): ${suspicious.length}`);
  for (const r of suspicious.slice(0, 50)) {
    console.log(`  - ${r.sku ?? r.id}: "${r.name}" packSize="${r.packSize}" unit="${r.unit ?? ''}"`);
  }
  if (suspicious.length > 50) console.log(`  ... and ${suspicious.length - 50} more`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
