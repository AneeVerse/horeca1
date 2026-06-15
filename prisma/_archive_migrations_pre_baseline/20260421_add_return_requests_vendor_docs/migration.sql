-- Migration: add return_requests and vendor_documents tables
-- Apply with: npx prisma migrate deploy

CREATE TABLE "return_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "admin_note" TEXT,
  "refund_amount" DECIMAL(12,2),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "return_requests"
  ADD CONSTRAINT "return_requests_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "return_requests"
  ADD CONSTRAINT "return_requests_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "return_requests"
  ADD CONSTRAINT "return_requests_order_id_key" UNIQUE ("order_id");

CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");

CREATE TABLE "vendor_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "vendor_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "file_url" VARCHAR(512) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "admin_note" TEXT,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "vendor_documents"
  ADD CONSTRAINT "vendor_documents_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "vendor_documents_vendor_id_idx" ON "vendor_documents"("vendor_id");
CREATE INDEX "vendor_documents_status_idx" ON "vendor_documents"("status");
