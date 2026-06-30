/**
 * Fill missing category images.
 * For each active category with no image_url, pick a representative product image:
 *  - sub-category  → a product whose category_id is this sub-category
 *  - top-category  → a product in any of this category's sub-categories
 * Prefer real CDN images (ImageKit / Cloudinary / horeca) over random test images.
 * Idempotent: only fills categories whose image_url is currently NULL/empty.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const PICK_IMAGE = `
  SELECT image_url FROM products
  WHERE %WHERE% AND image_url IS NOT NULL AND image_url <> '' AND is_active = true
  ORDER BY
    (image_url LIKE '%imagekit%' OR image_url LIKE '%cloudinary%' OR image_url LIKE '%horeca%') DESC,
    name ASC
  LIMIT 1
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  try {
    const cats = (await pool.query(`
      SELECT id, name, parent_id FROM categories
      WHERE is_active = true AND (image_url IS NULL OR image_url = '')
      ORDER BY (parent_id IS NULL) DESC, name
    `)).rows as { id: string; name: string; parent_id: string | null }[];

    let filled = 0, noImage = 0;
    for (const c of cats) {
      const sql = c.parent_id === null
        ? PICK_IMAGE.replace('%WHERE%', `category_id IN (SELECT id FROM categories WHERE parent_id = $1)`)
        : PICK_IMAGE.replace('%WHERE%', `category_id = $1`);
      const img = (await pool.query(sql, [c.id])).rows[0]?.image_url as string | undefined;
      if (!img) { noImage++; console.log(`  (no product image) ${c.name}`); continue; }
      await pool.query('UPDATE categories SET image_url = $1 WHERE id = $2', [img, c.id]);
      filled++;
      console.log(`  ${c.parent_id ? 'sub' : 'TOP'}  ${c.name}  ←  ${img.slice(0, 60)}…`);
    }
    console.log(`\nfilled=${filled} noImageAvailable=${noImage} alreadyHadImage=${'(skipped)'}`);
  } catch (err) {
    console.error('ERROR:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();
