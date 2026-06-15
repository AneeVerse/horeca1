-- Horeca1 Wallet & Vendor Credit (DiSCCO Basic). All NEW tables — additive, safe.
-- vendor_id NULL => H1 platform wallet; non-null => vendor credit line.

-- ── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE "credit_wallet_status"    AS ENUM ('ACTIVE', 'BLOCKED', 'BLACKLISTED');
CREATE TYPE "credit_wallet_txn_type"  AS ENUM ('CREDIT_ASSIGN', 'ORDER_DEBIT', 'REPAYMENT', 'PENALTY', 'REVERSAL');
CREATE TYPE "credit_repayment_mode"   AS ENUM ('REPAY_BEFORE_NEXT_USE', 'ALLOW_USAGE_TILL_DUE');
CREATE TYPE "billing_model_type"      AS ENUM ('BILL_TO_BILL', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY');
CREATE TYPE "credit_penalty_type"     AS ENUM ('LATE_FEE', 'INTEREST');

-- ── Global config (singleton) ──────────────────────────────────────────────
CREATE TABLE "global_credit_configs" (
  "id"                      UUID NOT NULL,
  "repaymentMode"           "credit_repayment_mode" NOT NULL DEFAULT 'REPAY_BEFORE_NEXT_USE',
  "billingModel"            "billing_model_type" NOT NULL DEFAULT 'BILL_TO_BILL',
  "creditLimit"             DECIMAL(12,2) NOT NULL DEFAULT 1000,
  "creditTenureDays"        INTEGER NOT NULL DEFAULT 3,
  "gracePeriodDays"         INTEGER NOT NULL DEFAULT 2,
  "blacklistDays"           INTEGER NOT NULL DEFAULT 10,
  "interestRatePct"         DECIMAL(6,3) NOT NULL DEFAULT 1.0,
  "interest_frequency_days" INTEGER NOT NULL DEFAULT 1,
  "penaltyAmount"           DECIMAL(12,2) NOT NULL DEFAULT 10.0,
  "penalty_frequency_days"  INTEGER NOT NULL DEFAULT 1,
  "eligible_purchase_count" INTEGER NOT NULL DEFAULT 3,
  "unlock_credit_amount"    DECIMAL(12,2) NOT NULL DEFAULT 10000,
  "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "global_credit_configs_pkey" PRIMARY KEY ("id")
);

-- ── Wallets ────────────────────────────────────────────────────────────────
CREATE TABLE "credit_wallets" (
  "id"                         UUID NOT NULL,
  "user_id"                    UUID NOT NULL,
  "vendor_id"                  UUID,
  "status"                     "credit_wallet_status" NOT NULL DEFAULT 'ACTIVE',
  "credit_limit"               DECIMAL(12,2) NOT NULL,
  "available_credit"           DECIMAL(12,2) NOT NULL,
  "used_credit"                DECIMAL(12,2) NOT NULL DEFAULT 0,
  "outstanding_amount"         DECIMAL(12,2) NOT NULL DEFAULT 0,
  "overdue_base_amount"        DECIMAL(12,2),
  "current_due_date"           TIMESTAMPTZ,
  "last_utilization_date"      TIMESTAMPTZ,
  "overdue_days"               INTEGER NOT NULL DEFAULT 0,
  "blacklist_exempt"           BOOLEAN NOT NULL DEFAULT false,
  "blacklisted_at"             TIMESTAMPTZ,
  "reactivated_at"             TIMESTAMPTZ,
  "override_repayment_mode"    "credit_repayment_mode",
  "override_billing_model"     "billing_model_type",
  "override_credit_limit"      DECIMAL(12,2),
  "override_credit_tenure"     INTEGER,
  "override_grace_period"      INTEGER,
  "override_blacklist_days"    INTEGER,
  "override_interest_rate"     DECIMAL(6,3),
  "override_interest_freq_days" INTEGER,
  "override_penalty_amount"    DECIMAL(12,2),
  "override_penalty_freq_days" INTEGER,
  "created_at"                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_wallets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "credit_wallets_user_id_idx"   ON "credit_wallets"("user_id");
CREATE INDEX "credit_wallets_vendor_id_idx" ON "credit_wallets"("vendor_id");
CREATE INDEX "credit_wallets_status_current_due_date_idx" ON "credit_wallets"("status", "current_due_date");
-- One vendor wallet per (user, vendor); one H1 wallet per user (vendor NULL).
CREATE UNIQUE INDEX "credit_wallets_user_vendor_uniq" ON "credit_wallets"("user_id", "vendor_id") WHERE "vendor_id" IS NOT NULL;
CREATE UNIQUE INDEX "credit_wallets_user_h1_uniq"     ON "credit_wallets"("user_id") WHERE "vendor_id" IS NULL;

-- ── Transactions (ledger) ──────────────────────────────────────────────────
CREATE TABLE "credit_wallet_transactions" (
  "id"                UUID NOT NULL,
  "wallet_id"         UUID NOT NULL,
  "type"              "credit_wallet_txn_type" NOT NULL,
  "amount"            DECIMAL(12,2) NOT NULL,
  "balance_after_txn" DECIMAL(12,2) NOT NULL,
  "reference_id"      TEXT,
  "note"              TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_wallet_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "credit_wallet_transactions_wallet_id_idx" ON "credit_wallet_transactions"("wallet_id");

-- ── Repayments ─────────────────────────────────────────────────────────────
CREATE TABLE "credit_wallet_repayments" (
  "id"                  UUID NOT NULL,
  "wallet_id"           UUID NOT NULL,
  "amount"              DECIMAL(12,2) NOT NULL,
  "repayment_method"    TEXT NOT NULL,
  "razorpay_order_id"   TEXT,
  "razorpay_payment_id" TEXT,
  "status"              TEXT NOT NULL DEFAULT 'PENDING',
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_wallet_repayments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "credit_wallet_repayments_razorpay_payment_id_key" ON "credit_wallet_repayments"("razorpay_payment_id");
CREATE INDEX "credit_wallet_repayments_wallet_id_idx" ON "credit_wallet_repayments"("wallet_id");
CREATE INDEX "credit_wallet_repayments_razorpay_order_id_idx" ON "credit_wallet_repayments"("razorpay_order_id");

-- ── Penalties / interest accruals ──────────────────────────────────────────
CREATE TABLE "credit_wallet_penalties" (
  "id"           UUID NOT NULL,
  "wallet_id"    UUID NOT NULL,
  "type"         "credit_penalty_type" NOT NULL,
  "amount"       DECIMAL(12,2) NOT NULL,
  "applied_date" DATE NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'APPLIED',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_wallet_penalties_pkey" PRIMARY KEY ("id")
);
-- Per-day idempotency: at most one INTEREST + one LATE_FEE per wallet per day.
CREATE UNIQUE INDEX "credit_wallet_penalties_wallet_type_date_uniq" ON "credit_wallet_penalties"("wallet_id", "type", "applied_date");
CREATE INDEX "credit_wallet_penalties_wallet_id_idx" ON "credit_wallet_penalties"("wallet_id");

-- ── Audit log ──────────────────────────────────────────────────────────────
CREATE TABLE "credit_wallet_audit_logs" (
  "id"             UUID NOT NULL,
  "wallet_id"      UUID NOT NULL,
  "action"         TEXT NOT NULL,
  "performed_by"   TEXT NOT NULL,
  "previous_value" TEXT,
  "new_value"      TEXT,
  "remarks"        TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_wallet_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "credit_wallet_audit_logs_wallet_id_idx" ON "credit_wallet_audit_logs"("wallet_id");

-- ── Foreign keys ───────────────────────────────────────────────────────────
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credit_wallet_transactions" ADD CONSTRAINT "credit_wallet_transactions_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_wallet_repayments" ADD CONSTRAINT "credit_wallet_repayments_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_wallet_penalties" ADD CONSTRAINT "credit_wallet_penalties_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_wallet_audit_logs" ADD CONSTRAINT "credit_wallet_audit_logs_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "credit_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
