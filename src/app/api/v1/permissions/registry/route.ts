/**
 * GET /api/v1/permissions/registry?scope=account|vendor|brand|admin|delivery
 *
 * Returns the permission registry (module → actions[]) used to render the
 * permission matrix UI. When ?scope= is supplied the response is narrowed
 * to just the modules relevant for that role-scope — customer-team roles
 * shouldn't see vendor-only modules like GRN / dispatch / inventory.
 *
 * Public read — no permission required (it's just a description of the
 * schema).
 */

import { NextRequest, NextResponse } from 'next/server';
import { MODULES, modulesForScope, type RoleScope } from '@/lib/permissions/registry';

const ALLOWED_SCOPES: readonly RoleScope[] = ['account', 'vendor', 'brand', 'admin', 'delivery'];

export function GET(req: NextRequest) {
  const scopeParam = req.nextUrl.searchParams.get('scope');
  if (scopeParam && (ALLOWED_SCOPES as readonly string[]).includes(scopeParam)) {
    return NextResponse.json({
      success: true,
      data: { modules: modulesForScope(scopeParam as RoleScope) },
    });
  }
  return NextResponse.json({ success: true, data: { modules: MODULES } });
}
