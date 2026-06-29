import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log('Using connection string:', connectionString);

async function main() {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('Connecting via Pool...');
    const client = await pool.connect();
    console.log('Successfully connected!');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Pool connection failed:', err);
  } finally {
    await pool.end();
  }
}

main();
