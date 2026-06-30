import 'dotenv/config';
import { NextRequest } from 'next/server';
import { PATCH } from '../src/app/api/v1/admin/products/[id]/route';

async function main() {
  const id = '70bf48a0-cf37-4dbd-82b4-8ef53e51f4b3';
  const url = `http://localhost:3000/api/v1/admin/products/${id}`;

  const req = new NextRequest(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hsn: '111111' }),
  });

  // Mock AuthContext
  const ctx = {
    userId: '87b92f20-de8e-4236-8f9b-eab2cef4bf2b',
    role: 'platform_admin',
    permissions: ['products.edit'],
  };

  try {
    const res = await PATCH(req, ctx as any);
    console.log('API PATCH status:', res.status);
    const json = await res.json();
    console.log('API PATCH response JSON:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('API PATCH handler crashed:', err);
  }
}

main().catch(console.error);
