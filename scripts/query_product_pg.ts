import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function main() {
  const pool = new Pool({ connectionString });
  try {
    const productId = '9f639bc8-f708-44af-8a22-6533fac9e4fd';
    console.log('Querying product via direct pg client:', productId);
    const res = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (res.rows.length === 0) {
      console.log('No product found with ID:', productId);
    } else {
      console.log('Product details:');
      console.log(JSON.stringify(res.rows[0], null, 2));

      // Also let's query its categories to check the categories mapping
      const catRes = await pool.query('SELECT * FROM product_categories WHERE product_id = $1', [productId]);
      console.log('Product category links:');
      console.log(JSON.stringify(catRes.rows, null, 2));
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
