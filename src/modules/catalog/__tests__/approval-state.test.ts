import { describe, it, expect } from 'vitest';
import {
  PRODUCT_APPROVAL_TRANSITIONS,
  canTransitionApproval,
  assertApprovalTransition,
  InvalidApprovalTransitionError,
  type ApprovalState,
} from '../approval-state';

const ALL_STATES = Object.keys(PRODUCT_APPROVAL_TRANSITIONS) as ApprovalState[];

describe('PRODUCT_APPROVAL_TRANSITIONS map', () => {
  it('lists only known states as targets', () => {
    for (const [, targets] of Object.entries(PRODUCT_APPROVAL_TRANSITIONS)) {
      for (const t of targets) {
        expect(ALL_STATES).toContain(t);
      }
    }
  });

  it('never lists a state as a transition to itself', () => {
    for (const [from, targets] of Object.entries(PRODUCT_APPROVAL_TRANSITIONS)) {
      expect(targets).not.toContain(from as ApprovalState);
    }
  });
});

describe('canTransitionApproval — every declared valid transition', () => {
  for (const [from, targets] of Object.entries(PRODUCT_APPROVAL_TRANSITIONS)) {
    for (const to of targets) {
      it(`allows ${from} → ${to}`, () => {
        expect(canTransitionApproval(from as ApprovalState, to)).toBe(true);
        expect(() => assertApprovalTransition(from as ApprovalState, to)).not.toThrow();
      });
    }
  }

  it('treats a no-op (from === to) as allowed', () => {
    for (const s of ALL_STATES) {
      expect(canTransitionApproval(s, s)).toBe(true);
    }
  });
});

describe('canTransitionApproval — lifecycle transitions the codebase actually performs', () => {
  it('allows the resubmit instant-approve path (rejected → approved)', () => {
    expect(canTransitionApproval('rejected', 'approved')).toBe(true);
  });
  it('allows the plain resubmit path (rejected → pending)', () => {
    expect(canTransitionApproval('rejected', 'pending')).toBe(true);
  });
  it('allows applying/rejecting a queued edit (pending_edit → approved)', () => {
    expect(canTransitionApproval('pending_edit', 'approved')).toBe(true);
  });
  it('allows queueing a material edit (approved → pending_edit)', () => {
    expect(canTransitionApproval('approved', 'pending_edit')).toBe(true);
  });
});

describe('canTransitionApproval — invalid transitions are rejected', () => {
  const INVALID: Array<[ApprovalState, ApprovalState]> = [
    ['approved', 'pending'],
    ['approved', 'rejected'],
    ['pending_edit', 'pending'],
    ['archived', 'rejected'],
    ['rejected', 'pending_edit'],
    ['under_review', 'pending'],
  ];

  for (const [from, to] of INVALID) {
    it(`rejects ${from} → ${to}`, () => {
      expect(canTransitionApproval(from, to)).toBe(false);
      expect(() => assertApprovalTransition(from, to)).toThrow(InvalidApprovalTransitionError);
    });
  }

  it('throws a 409-coded error with from/to context', () => {
    try {
      assertApprovalTransition('approved', 'pending');
      throw new Error('expected assertApprovalTransition to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidApprovalTransitionError);
      const err = e as InvalidApprovalTransitionError;
      expect(err.statusCode).toBe(409);
      expect(err.from).toBe('approved');
      expect(err.to).toBe('pending');
    }
  });
});
