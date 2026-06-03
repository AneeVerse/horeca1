/**
 * Commission service — V2.2 Phase 1 (structure-only).
 *
 * Responsibilities:
 *   1. findApplicableRule()  — pick the most-specific active CommissionRule
 *      for a given (vendor, salesperson, order) at the moment a commission
 *      should accrue. Resolution priority: customer > brand > category >
 *      default. Within the same scope the most-recently-updated rule wins.
 *   2. createAccrual()       — write a CommissionAccrual using the resolved
 *      rule. Idempotent via the (orderId, salespersonId) unique constraint.
 *   3. summarize()           — totals per salesperson per period, used by
 *      the vendor's Commission Report page.
 *
 * What this file deliberately does NOT do:
 *   - Pay out money. That's offline today; vendor marks accrual as 'paid'
 *     after disbursement. A future commit may add a payout pipeline that
 *     reads from CommissionAccrual where status='approved'.
 */

import { Prisma } from '@prisma/client';
import type {
  CommissionAccrual,
  CommissionRule,
  CommissionRuleScope,
  Order,
  PrismaClient,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export interface RuleResolutionInput {
  vendorId: string;
  salespersonId: string;
  // We only need the fields the rule predicates read. Keeping the type
  // narrow lets callers pass a partial select() without TS gymnastics.
  order: Pick<Order, 'id' | 'totalAmount' | 'createdAt' | 'userId'>;
  // VendorCustomer mapping for the order's customer — used to resolve
  // customer-scoped rules. Caller provides it; we don't re-fetch here.
  vendorCustomerId: string | null;
  // Brand + category come from the order's line items. Caller may collect
  // them once (the order service does) and pass arrays. We try to match
  // ANY brand / category found, picking the highest-priority match.
  brandIds: readonly string[];
  categoryIds: readonly string[];
}

/**
 * Pick the most-specific active rule that applies to this order.
 * Returns null if no rule matches — caller skips accrual creation.
 *
 * Rules are scored: customer = 4, brand = 3, category = 2, default = 1.
 * Highest score wins; tie-break by `updatedAt` descending so a freshly-
 * tuned rule overrides a stale duplicate.
 */
export async function findApplicableRule(
  input: RuleResolutionInput,
  db: Db = defaultPrisma,
): Promise<CommissionRule | null> {
  const now = new Date();
  const orderTotal = new Prisma.Decimal(input.order.totalAmount);

  // Pull every active rule for this (vendor, salesperson) in one query.
  // The set is small (<50 per salesperson realistically) so we filter in
  // memory rather than building a huge OR query.
  const rules = await db.commissionRule.findMany({
    where: {
      vendorId: input.vendorId,
      salespersonId: input.salespersonId,
      isActive: true,
      // validity window: nulls mean "open-ended"
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (rules.length === 0) return null;

  const SCOPE_SCORE: Record<CommissionRuleScope, number> = {
    customer: 4,
    brand: 3,
    category: 2,
    default: 1,
  };

  let best: { rule: CommissionRule; score: number } | null = null;

  for (const rule of rules) {
    // Eligibility: scope ref must match the order's context.
    if (rule.scope === 'customer') {
      if (!input.vendorCustomerId || rule.scopeRefId !== input.vendorCustomerId) continue;
    } else if (rule.scope === 'brand') {
      if (!rule.scopeRefId || !input.brandIds.includes(rule.scopeRefId)) continue;
    } else if (rule.scope === 'category') {
      if (!rule.scopeRefId || !input.categoryIds.includes(rule.scopeRefId)) continue;
    }
    // scope='default' always passes — no scopeRefId to check.

    // Eligibility: minOrderValue gate.
    if (rule.minOrderValue && orderTotal.lessThan(rule.minOrderValue)) continue;

    const score = SCOPE_SCORE[rule.scope];
    if (!best || score > best.score) best = { rule, score };
    // tie on score → first wins (rules already ordered by updatedAt desc)
  }

  return best?.rule ?? null;
}

export interface CreateAccrualInput {
  order: Pick<Order, 'id' | 'vendorId' | 'totalAmount' | 'createdAt' | 'salespersonId'>;
  rule: CommissionRule;
}

/**
 * Compute the accrued amount per rule + write the CommissionAccrual row.
 * Returns the row that was created OR the one that was already there
 * (idempotent via the (orderId, salespersonId) unique constraint).
 *
 * Caller must verify `order.salespersonId` is set before invoking — we
 * read it here to make the FK explicit.
 */
export async function createAccrual(
  input: CreateAccrualInput,
  db: Db = defaultPrisma,
): Promise<CommissionAccrual> {
  if (!input.order.salespersonId) {
    throw new Error('createAccrual: order.salespersonId is required');
  }

  const orderTotal = new Prisma.Decimal(input.order.totalAmount);
  let accruedAmount: Prisma.Decimal;
  if (input.rule.ratePercent != null) {
    // amount = orderTotal * ratePercent / 100, rounded to 2dp via Decimal arithmetic
    accruedAmount = orderTotal.mul(input.rule.ratePercent).div(100);
  } else if (input.rule.rateFixed != null) {
    accruedAmount = new Prisma.Decimal(input.rule.rateFixed);
  } else {
    // DB CHECK constraint guarantees one is set; defensive throw covers the
    // case where a raw SQL insert violated it before we tightened things.
    throw new Error('createAccrual: rule must have ratePercent OR rateFixed');
  }

  const period = formatPeriod(input.order.createdAt);

  // upsert pattern: the (orderId, salespersonId) unique constraint makes
  // this idempotent. We do NOT use prisma.upsert because we want creation-
  // only semantics on retry — never recompute the accrued amount.
  const existing = await db.commissionAccrual.findUnique({
    where: {
      orderId_salespersonId: {
        orderId: input.order.id,
        salespersonId: input.order.salespersonId,
      },
    },
  });
  if (existing) return existing;

  return db.commissionAccrual.create({
    data: {
      orderId: input.order.id,
      vendorId: input.order.vendorId,
      salespersonId: input.order.salespersonId,
      ruleId: input.rule.id,
      baseAmount: orderTotal,
      ratePercent: input.rule.ratePercent,
      rateFixed: input.rule.rateFixed,
      accruedAmount,
      period,
      status: 'pending',
    },
  });
}

export interface SummarizeInput {
  vendorId: string;
  /** YYYY-MM. If omitted, current month. */
  period?: string;
  salespersonId?: string;
}

export interface SummaryRow {
  salespersonId: string;
  salespersonName: string;
  pending: number;
  approved: number;
  paid: number;
  cancelled: number;
  total: number;   // pending + approved + paid (i.e. everything not cancelled)
  count: number;
}

/**
 * Per-salesperson commission totals for a period. Driven by GROUP BY in
 * Postgres for speed; we then enrich names via a single round-trip.
 */
export async function summarize(input: SummarizeInput, db: Db = defaultPrisma): Promise<SummaryRow[]> {
  const period = input.period ?? formatPeriod(new Date());

  const grouped = await db.commissionAccrual.groupBy({
    by: ['salespersonId', 'status'],
    where: {
      vendorId: input.vendorId,
      period,
      ...(input.salespersonId ? { salespersonId: input.salespersonId } : {}),
    },
    _sum: { accruedAmount: true },
    _count: { _all: true },
  });

  // Collapse the (salespersonId, status) rows into one row per salesperson
  // with all four status sums on it.
  const map = new Map<string, SummaryRow>();
  for (const row of grouped) {
    let r = map.get(row.salespersonId);
    if (!r) {
      r = {
        salespersonId: row.salespersonId,
        salespersonName: '',
        pending: 0,
        approved: 0,
        paid: 0,
        cancelled: 0,
        total: 0,
        count: 0,
      };
      map.set(row.salespersonId, r);
    }
    const sum = Number(row._sum.accruedAmount ?? 0);
    r[row.status] = sum;
    r.count += row._count._all;
    if (row.status !== 'cancelled') r.total += sum;
  }

  // Backfill names so the UI doesn't need a second round-trip per row.
  const ids = Array.from(map.keys());
  if (ids.length > 0) {
    const sps = await db.salesperson.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    for (const s of sps) {
      const r = map.get(s.id);
      if (r) r.salespersonName = s.name;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** YYYY-MM helper — used as the `period` discriminator on accruals. */
export function formatPeriod(d: Date): string {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}
