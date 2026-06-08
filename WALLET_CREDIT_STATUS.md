# Wallet & Vendor Credit (DiSCCO Basic) — Build Status

**Branch:** `feat/wallet-credit` (NOT merged — prod untouched; CI/deploy only fire on `master`).
**Decisions:** unify on `CreditWallet` (retire `CreditAccount`); money-core first. Interest = compound. Same config engine for H1 wallet + vendor credit. Verified `tsc` 0 / `lint` 0 on all committed code.

> The prior pass was a non-functional skeleton (`new PrismaClient()` with no Prisma-7 adapter → would throw on first call; wrong compound-interest base; unauthenticated routes; broken H1 uniqueness; hallucinated code). It was rebuilt.

## ✅ Done (committed on the branch)

### Wave 1 — engine + schema (money-core)
- Schema: `GlobalCreditConfig`, `CreditWallet`, `CreditWalletTxn`, `CreditWalletRepayment`, `CreditWalletPenalty`, `CreditWalletAuditLog` (+ enums). Migration `prisma/migrations/20260607_credit_wallet`.
- Fixes vs prior: shared `@/lib/prisma` adapter; **compound interest on the captured overdue principal** (not the inflated outstanding); **per-day idempotent** interest+penalty (`@@unique(walletId,type,appliedDate)` + P2002 catch); **DB idempotency on `razorpay_payment_id`**; **H1 uniqueness** via partial unique indexes; `blacklistExempt` so reactivation-with-dues isn't re-blacklisted; unlock-amount + interest/penalty **frequency-in-days** config.
- Engine (`src/modules/credit/creditWallet.service.ts`): config resolve (global⊕override), eligibility + `maybeAutoUnlockH1Wallet`, `assignCredit`, `debitWallet`, `applyRepayment` (finalizes the pending Razorpay row), `processOverdueAccounts`, `reactivateWallet`, audit on every mutation.
- Routes (all auth-gated + Zod): `GET /wallet` (customer-scoped), `POST /wallet/create-repayment-order` (customer), `POST /wallet/razorpay-webhook` (HMAC, length-safe), `POST /wallet/debit` (admin), `POST /wallet/reactivate` (admin), `GET /wallet/reports` (admin), `POST /admin/credit/assign`, `GET|PATCH /admin/credit/config` (audited).

### Wave 2 — order/checkout integration
- Credit orders **debit `CreditWallet` inside the order transaction** (atomic; validates status/repayment-mode/limit), enforce **item `creditEligible`**, and **release on cancel** (`reverseOrderDebit`, idempotent). Draft submit debits too. Auto-unlock on the `OrderDelivered` event.
- `prisma/scripts/migrate-creditaccount-to-wallet.ts` — legacy `CreditAccount` → `CreditWallet` (preserves balances + per-account config as overrides).

### Wave 4 (backend) — accruals + reminders + cron
- `sendDueReminders` (2d/1d/0d before due + day 3 & 10 overdue → in-app/SMS/WhatsApp), `runDailyCreditTasks`, and `POST /admin/credit/cron` (CRON_SECRET-gated).

### Wave 3 (part) — customer UI
- `/wallet` dashboard: limit/available/outstanding/due + **Repay-Now (Razorpay)** + history. (Razorpay global consolidated to `src/types/razorpay.d.ts`.)

## ⏳ Remaining
- **Wave 3 UI:** admin credit panel (assign/edit-limit/reactivate, Excel-style) + the 4 reports pages (overdue/utilization/interest/audit — API `GET /wallet/reports` ready) + vendor collections dashboard + **checkout "Pay via Credit" option** (repoint the checkout available-credit display from `/credit/check`→`CreditWallet`; the order backend already debits the wallet for `paymentMethod:'credit'`).
- **Retire legacy surfaces:** repoint `/api/v1/credit/*` routes, `credit.service.ts`, and the admin user-detail credit display from `CreditAccount` → `CreditWallet`.
- **Wave 4:** verification script; optional missed-webhook reconcile cron (webhook is already idempotent).
- **Split payment** ("Pay Now + Credit mix") — deferred.

## 🚀 Prod rollout (when merging to master)
1. **Back up the DB** (`docker exec horeca1-db pg_dump -U horeca1 -d horeca1 > backup.sql`).
2. Merge `feat/wallet-credit` → `master` (CI builds + deploys). The `20260607_credit_wallet` migration is **additive** (new tables only) and applies via `migrate deploy`.
3. Migrate legacy data via tunnel: `npx tsx prisma/scripts/migrate-creditaccount-to-wallet.ts --dry-run` then without `--dry-run`.
4. Set **`CRON_SECRET`** in `.env.production` and add a daily cron: `curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost/api/v1/admin/credit/cron`.
5. Set the Razorpay **wallet webhook** → `https://freshville.store/api/v1/wallet/razorpay-webhook` (event `payment.captured`) using `RAZORPAY_WEBHOOK_SECRET`.

*All committed code is tsc + lint clean. Nothing is live until merged.*
