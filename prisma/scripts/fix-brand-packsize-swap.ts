/**
 * Fix swapped pack_size / unit on BrandMasterProduct rows (e.g. packSize="Bottle", unit empty).
 * Run: npx tsx prisma/scripts/fix-brand-packsize-swap.ts [--apply]
 */
import { prisma } from '../../src/lib/prisma';
import { looksLikeContainerToken, looksLikeQuantityToken } from '../../src/lib/packSizeValidation';

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await prisma.brandMasterProduct.findMany({
    select: { id: true, name: true, packSize: true, unit: true, sku: true },
  });

  const fixes: Array<{ id: string; name: string; from: string; to: { packSize: string | null; unit: string | null } }> = [];

  for (const r of rows) {
    const ps = (r.packSize ?? '').trim();
    const u = (r.unit ?? '').trim();
    if (!ps && !u) continue;

    if (!u && looksLikeContainerToken(ps) && !looksLikeQuantityToken(ps)) {
      fixes.push({ id: r.id, name: r.name, from: `packSize="${ps}"`, to: { packSize: null, unit: ps } });
      continue;
    }
    if (ps && u && looksLikeContainerToken(ps) && looksLikeQuantityToken(u)) {
      fixes.push({ id: r.id, name: r.name, from: `pack="${ps}" unit="${u}"`, to: { packSize: u, unit: ps } });
    }
  }

  console.log(`Checked ${rows.length} products — ${fixes.length} fix(es) suggested`);
  for (const f of fixes.slice(0, 30)) {
    console.log(`  ${f.name}: ${f.from} → packSize="${f.to.packSize}" unit="${f.to.unit}"`);
  }
  if (fixes.length > 30) console.log(`  ... and ${fixes.length - 30} more`);

  if (!apply) {
    console.log('\nDry run. Pass --apply to write fixes.');
    return;
  }

  for (const f of fixes) {
    await prisma.brandMasterProduct.update({
      where: { id: f.id },
      data: { packSize: f.to.packSize, unit: f.to.unit },
    });
  }
  console.log(`Applied ${fixes.length} fix(es).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
