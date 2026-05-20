/**
 * GET /api/v1/permissions/registry
 *
 * Returns the permission registry (module → actions[]) used to render the
 * permission matrix UI at /account/[id]/roles.
 *
 * Public read — no permission required (it's just a description of the schema).
 */

import { NextResponse } from 'next/server';
import { MODULES } from '@/lib/permissions/registry';

export function GET() {
  return NextResponse.json({ success: true, data: { modules: MODULES } });
}
