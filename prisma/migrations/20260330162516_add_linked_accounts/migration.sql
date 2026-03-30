-- CreateTable
CREATE TABLE "linked_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "linked_user_id" UUID NOT NULL,
    "switch_token" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_switch_token_key" ON "linked_accounts"("switch_token");

-- CreateIndex
CREATE INDEX "linked_accounts_user_id_idx" ON "linked_accounts"("user_id");

-- CreateIndex
CREATE INDEX "linked_accounts_switch_token_idx" ON "linked_accounts"("switch_token");

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_user_id_linked_user_id_key" ON "linked_accounts"("user_id", "linked_user_id");

-- AddForeignKey
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
