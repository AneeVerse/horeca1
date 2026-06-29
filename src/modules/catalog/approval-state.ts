// Product approval state machine — single source of truth for valid transitions.
//
// PURE module: type-only Prisma import (erased at runtime) so it can be unit-tested
// with no DB / no next/server in scope. The DB-touching `transitionProductApproval`
// lives in ./approval-state.service.ts.
//
// The map is derived from the ACTUAL product lifecycle in catalog.service so it never
// rejects a transition the passing code already performs:
//   • rejected → approved        (resubmit that matches an approved master → instant approve)
//   • rejected → pending          (plain resubmit re-enters the queue)
//   • pending_edit → approved     (admin applies, OR rejects-keeping-live)
// Archive is visibility-only (isActive + archivedAt); the `archived` state + `→ archived`
// edges exist for completeness and future explicit archival.

import type { ApprovalStatus } from '@prisma/client';

export type ApprovalState = ApprovalStatus;

export class InvalidApprovalTransitionError extends Error {
  readonly statusCode = 409;
  readonly code = 'INVALID_TRANSITION';
  constructor(
    public readonly from: ApprovalState,
    public readonly to: ApprovalState,
  ) {
    super(`Invalid product approval transition: "${from}" → "${to}".`);
    this.name = 'InvalidApprovalTransitionError';
  }
}

export const PRODUCT_APPROVAL_TRANSITIONS: Record<ApprovalState, readonly ApprovalState[]> = {
  pending: ['under_review', 'approved', 'rejected', 'needs_changes', 'archived'],
  under_review: ['approved', 'rejected', 'needs_changes', 'archived'],
  needs_changes: ['pending', 'approved', 'rejected', 'archived'],
  rejected: ['pending', 'approved', 'archived'],
  approved: ['pending_edit', 'archived'],
  pending_edit: ['approved', 'rejected', 'archived'],
  archived: ['pending', 'approved'],
};

/** True when `to` is reachable from `from`. A no-op (from === to) is always allowed. */
export function canTransitionApproval(from: ApprovalState, to: ApprovalState): boolean {
  if (from === to) return true;
  return (PRODUCT_APPROVAL_TRANSITIONS[from] ?? []).includes(to);
}

/** Throws InvalidApprovalTransitionError when the transition is not allowed. */
export function assertApprovalTransition(from: ApprovalState, to: ApprovalState): void {
  if (!canTransitionApproval(from, to)) {
    throw new InvalidApprovalTransitionError(from, to);
  }
}
