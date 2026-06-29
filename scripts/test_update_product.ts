import 'dotenv/config';
import { Pool } from 'pg';
import { CatalogService } from '../src/modules/catalog/catalog.service';

const connectionString = process.env.DATABASE_URL;

async function main() {
  const pool = new Pool({ connectionString });
  
  try {
    // 1. Resolve category IDs
    const dairyRes = await pool.query("SELECT id, name FROM categories WHERE name ILIKE 'Dairy'");
    const milkRes = await pool.query("SELECT id, name FROM categories WHERE name ILIKE 'milk'");

    console.log('Dairy Categories:', dairyRes.rows);
    console.log('Milk Categories:', milkRes.rows);

    const dairyId = dairyRes.rows[0]?.id;
    const milkId = milkRes.rows[0]?.id;

    if (!milkId) {
      console.error("Sub-category 'milk' not found in database!");
      return;
    }

    // 2. Call CatalogService.updateProduct
    const catalogService = new CatalogService();
    
    const productId = '9f639bc8-f708-44af-8a22-6533fac9e4fd';
    const vendorId = '41d3ab99-4d58-4787-bff2-d7e36d23c139';
    const actorUserId = '41d3ab99-4d58-4787-bff2-d7e36d23c139'; // mock actor user id (vendor owner)

    console.log(`\nAttempting updateProduct for product ${productId}...`);
    
    // We mock the update payload with the brand 'Everest' and categories [milkId]
    const updatePayload = {
      name: 'Amul Processed Cheese Block ETG 1 Kg',
      brand: 'Everest',
      basePrice: 523.81,
      categoryIds: [milkId],
      listingStatus: 'submitted' as const,
    };

    console.log('Update payload:', JSON.stringify(updatePayload, null, 2));

    const updated = await catalogService.updateProduct(productId, vendorId, updatePayload, actorUserId);
    console.log('Update Succeeded!', JSON.stringify(updated, null, 2));

  } catch (err: any) {
    console.error('\nUpdate Failed with error:');
    console.error(err);
    if (err.stack) {
      console.error(err.stack);
    }
  } finally {
    await pool.end();
  }
}

main();
