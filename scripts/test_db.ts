import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL || '';
console.log('DATABASE_URL is:', url);

async function testConnection(host: string, port: number) {
  console.log(`Testing connection to ${host}:${port}...`);
  const client = new Client({
    host,
    port,
    user: 'horeca1',
    password: '5RWoLMyTN6fyA27EXpsf0w11',
    database: 'horeca1',
    connectionTimeoutMillis: 2000,
  });

  try {
    await client.connect();
    console.log(`Successfully connected to ${host}:${port}!`);
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error(`Failed to connect to ${host}:${port}:`, err);
  }
}

async function main() {
  await testConnection('127.0.0.1', 5433);
  await testConnection('localhost', 5433);
  await testConnection('::1', 5433);
}

main();
