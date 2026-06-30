/**
 * One-time catalog restructure:
 *  - Build clean 2-level Category → Sub-Category taxonomy
 *  - Remap EVERY product to a SUB-category (never a top-level category)
 *  - Populate category_categories (sub→parent M2M) + product_categories (item→subcat M2M)
 *  - Delete test-junk products (archive ones with order history) and junk categories
 *
 * Idempotent: safe to re-run. Autocommit (no big txn) so a single FK error stays isolated.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const TAXONOMY: Record<string, string[]> = {
  'Beverages': ['Syrups', 'Smoothie & Beverage Blends', 'Frappe Powders'],
  'Dairy': ['Cheese', 'Butter & Spreads', 'Milk', 'Ghee'],
  'Mayo & Sauces': ['Mayonnaise', 'Dips & Dressings', 'Ketchup & Sauces'],
  'Chinese': ['Soy Sauce', 'Chilli Sauce', 'Schezwan & Chutney', 'Tomato Sauce'],
  'Sachet': ['Sauce Sachets', 'Seasoning Sachets', 'Pickle Sachets'],
  'Frozen': ['Patties & Snacks', 'Fries'],
  'Masala Seasonings': ['Sprinklers & Seasonings'],
  'Japanese Cuisine': ['Japanese Essentials'],
  'International Cuisine': ['Tortillas & Wraps'],
  'Staples': ['Rice & Grains', 'Other Grocery'],
};

const JUNK_DELETE = ['jjj', 'jjjjjjjjjjj', 'ertyui', 'lllllllll', 'churma', 'pro-02'];
const JUNK_ARCHIVE = ['anees'];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Returns [parent, sub] | 'DELETE' | 'ARCHIVE'. Order matters (specific → generic).
function classify(name: string): [string, string] | 'DELETE' | 'ARCHIVE' {
  const n = name.toLowerCase().trim();
  if (JUNK_DELETE.includes(n)) return 'DELETE';
  if (JUNK_ARCHIVE.includes(n)) return 'ARCHIVE';

  if (/sachet/.test(n)) {
    if (/pickle/.test(n)) return ['Sachet', 'Pickle Sachets'];
    if (/flake|oregano|seasoning/.test(n)) return ['Sachet', 'Seasoning Sachets'];
    return ['Sachet', 'Sauce Sachets'];
  }
  if (/nori|noori|sushi|wasabi|miso/.test(n)) return ['Japanese Cuisine', 'Japanese Essentials'];
  if (/tortilla|wrap/.test(n)) return ['International Cuisine', 'Tortillas & Wraps'];
  if (/patty|burger/.test(n)) return ['Frozen', 'Patties & Snacks'];
  if (/fries/.test(n)) return ['Frozen', 'Fries'];
  if (/smoothie|beverage blend|lemonade/.test(n)) return ['Beverages', 'Smoothie & Beverage Blends'];
  if (/frappe|powder|cocoa/.test(n)) return ['Beverages', 'Frappe Powders'];
  if (/syrup|grenadine/.test(n)) return ['Beverages', 'Syrups'];
  // DaVinci café line: caramel/chocolate "sauces" are dessert toppings, not Chinese sauces.
  if (/\bdavinci\b/.test(n)) return ['Beverages', 'Syrups'];
  if (/soy sauce/.test(n)) return ['Chinese', 'Soy Sauce'];
  if (/schezwan|szechuan|chutney/.test(n)) return ['Chinese', 'Schezwan & Chutney'];
  if (/chilli sauce/.test(n)) return ['Chinese', 'Chilli Sauce'];
  if (/mayo|mayonnaise/.test(n)) return ['Mayo & Sauces', 'Mayonnaise'];
  if (/dip|dressing|jalapeno|chipotle|barbeque|bbq/.test(n)) return ['Mayo & Sauces', 'Dips & Dressings'];
  if (/ketchup/.test(n)) return ['Mayo & Sauces', 'Ketchup & Sauces'];
  if (/pizza sauce|pasta sauce|pasta & pizza/.test(n)) return ['Mayo & Sauces', 'Ketchup & Sauces'];
  if (/tomato sauce/.test(n)) return ['Chinese', 'Tomato Sauce'];
  if (/cheese|mozzarella|cheddar/.test(n)) return ['Dairy', 'Cheese'];
  if (/ghee/.test(n)) return ['Dairy', 'Ghee'];
  if (/butter|spread/.test(n)) return ['Dairy', 'Butter & Spreads'];
  if (/milk/.test(n)) return ['Dairy', 'Milk'];
  if (/sprinkler|seasoning/.test(n)) return ['Masala Seasonings', 'Sprinklers & Seasonings'];
  if (/rice|grain|magaj|atta|flour|\bdal\b|pulse|idli|dosa/.test(n)) return ['Staples', 'Rice & Grains'];
  return ['Staples', 'Other Grocery']; // safety net — never lands on a top-level category
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });

  const keepSet = new Set<string>();
  for (const [parent, subs] of Object.entries(TAXONOMY)) {
    keepSet.add(parent.toLowerCase());
    for (const s of subs) keepSet.add(s.toLowerCase());
  }

  // Find-or-create a category by case-insensitive name; (re)set its parent + activate.
  async function upsertCategory(name: string, parentId: string | null): Promise<string> {
    const existing = await pool.query('SELECT id FROM categories WHERE lower(name)=lower($1) LIMIT 1', [name]);
    if (existing.rows[0]) {
      const id = existing.rows[0].id;
      await pool.query(
        `UPDATE categories SET name=$1, parent_id=$2, is_active=true, approval_status='approved' WHERE id=$3`,
        [name, parentId, id],
      );
      return id;
    }
    let slug = slugify(name);
    let s = slug, i = 1;
    while ((await pool.query('SELECT 1 FROM categories WHERE slug=$1', [s])).rowCount) { i++; s = `${slug}-${i}`; }
    const ins = await pool.query(
      `INSERT INTO categories (id,name,slug,parent_id,is_active,approval_status,sort_order,created_at)
       VALUES (gen_random_uuid(),$1,$2,$3,true,'approved',0,now()) RETURNING id`,
      [name, s, parentId],
    );
    return ins.rows[0].id;
  }

  try {
    console.log('── 1. Build taxonomy ──');
    const parentIds: Record<string, string> = {};
    for (const parent of Object.keys(TAXONOMY)) {
      parentIds[parent] = await upsertCategory(parent, null);
    }
    const subIds: Record<string, string> = {};
    for (const [parent, subs] of Object.entries(TAXONOMY)) {
      for (const sub of subs) {
        const id = await upsertCategory(sub, parentIds[parent]);
        subIds[`${parent}>${sub}`] = id;
        await pool.query(
          `INSERT INTO category_categories (category_id, sub_category_id, is_primary)
           VALUES ($1,$2,true) ON CONFLICT (category_id, sub_category_id) DO UPDATE SET is_primary=true`,
          [parentIds[parent], id],
        );
      }
    }
    console.log(`  ${Object.keys(parentIds).length} parents, ${Object.keys(subIds).length} sub-categories ready`);

    console.log('── 2. Remap products ──');
    const products = (await pool.query('SELECT id, name FROM products')).rows as { id: string; name: string }[];
    let remapped = 0, deleted = 0, archived = 0;
    const fallbackSub = subIds['Staples>Rice & Grains'];

    for (const p of products) {
      const c = classify(p.name);

      if (c === 'DELETE') {
        try {
          await pool.query('DELETE FROM products WHERE id=$1', [p.id]);
          deleted++;
        } catch {
          await pool.query(
            `UPDATE products SET is_active=false, category_id=$1, name=$2,
               slug=concat('_deleted_', extract(epoch from now())::bigint, '_', slug) WHERE id=$3`,
            [fallbackSub, `[Deleted] ${p.name}`.slice(0, 255), p.id],
          );
          await pool.query('DELETE FROM product_categories WHERE product_id=$1', [p.id]);
          await pool.query(
            `INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
             VALUES ($1,$2,true,now()) ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary=true`,
            [p.id, fallbackSub],
          );
          archived++;
        }
        continue;
      }

      if (c === 'ARCHIVE') {
        await pool.query(
          `UPDATE products SET is_active=false, category_id=$1,
             name=CASE WHEN name LIKE '[Deleted]%' THEN name ELSE concat('[Deleted] ', name) END WHERE id=$2`,
          [fallbackSub, p.id],
        );
        await pool.query('DELETE FROM product_categories WHERE product_id=$1', [p.id]);
        await pool.query(
          `INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
           VALUES ($1,$2,true,now()) ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary=true`,
          [p.id, fallbackSub],
        );
        archived++;
        continue;
      }

      const subId = subIds[`${c[0]}>${c[1]}`];
      await pool.query('UPDATE products SET category_id=$1 WHERE id=$2', [subId, p.id]);
      await pool.query('DELETE FROM product_categories WHERE product_id=$1', [p.id]);
      await pool.query(
        `INSERT INTO product_categories (product_id, category_id, is_primary, created_at)
         VALUES ($1,$2,true,now()) ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary=true`,
        [p.id, subId],
      );
      remapped++;
    }
    console.log(`  remapped=${remapped}, deleted=${deleted}, archived=${archived}`);

    console.log('── 3. Clean up junk categories ──');
    // Sub-categories (parent_id NOT NULL) first so parents become leaf-deletable.
    const junk = (await pool.query(
      `SELECT id, name, parent_id FROM categories WHERE lower(name) <> ALL($1::text[])
       ORDER BY (parent_id IS NULL)`,
      [Array.from(keepSet)],
    )).rows as { id: string; name: string; parent_id: string | null }[];
    let catDeleted = 0, catDeactivated = 0;
    for (const cat of junk) {
      try {
        await pool.query('DELETE FROM categories WHERE id=$1', [cat.id]);
        catDeleted++;
      } catch {
        await pool.query(`UPDATE categories SET is_active=false WHERE id=$1`, [cat.id]);
        catDeactivated++;
        console.log(`    (kept-but-deactivated, has refs) ${cat.name}`);
      }
    }
    console.log(`  categories deleted=${catDeleted}, deactivated=${catDeactivated}`);

    console.log('── 4. Verify ──');
    const onTop = await pool.query(
      `SELECT COUNT(*) n FROM products pr JOIN categories c ON c.id=pr.category_id WHERE c.parent_id IS NULL`,
    );
    const noCat = await pool.query(`SELECT COUNT(*) n FROM products WHERE category_id IS NULL`);
    const threeLevel = await pool.query(
      `SELECT COUNT(*) n FROM categories c JOIN categories p ON p.id=c.parent_id WHERE p.parent_id IS NOT NULL`,
    );
    console.log(`  products on a TOP-LEVEL category (must be 0): ${onTop.rows[0].n}`);
    console.log(`  products with NO category (must be 0):        ${noCat.rows[0].n}`);
    console.log(`  categories nested 3 levels deep (must be 0):  ${threeLevel.rows[0].n}`);

    console.log('\n── Final tree ──');
    const tree = await pool.query(
      `SELECT p.name parent, c.name sub, COUNT(pr.id) n
       FROM categories c JOIN categories p ON p.id=c.parent_id
       LEFT JOIN products pr ON pr.category_id=c.id AND pr.is_active=true
       WHERE c.is_active=true
       GROUP BY p.name, c.name ORDER BY p.name, c.name`,
    );
    let cur = '';
    for (const r of tree.rows) {
      if (r.parent !== cur) { console.log(`\n${r.parent}`); cur = r.parent; }
      console.log(`  └─ ${r.sub} (${r.n})`);
    }
  } catch (err) {
    console.error('ERROR:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();
