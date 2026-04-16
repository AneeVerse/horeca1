-- Append-only log of privileged mutations (admin approvals, RBAC changes, price edits).
CREATE TABLE "audit_logs" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "actor_id"   UUID,
    "actor_role" VARCHAR(50),
    "action"     VARCHAR(100) NOT NULL,
    "entity"     VARCHAR(100) NOT NULL,
    "entity_id"  VARCHAR(255),
    "before"     JSONB,
    "after"      JSONB,
    "metadata"   JSONB,
    "ip"         VARCHAR(64),
    "at"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "audit_logs_actor_id_at_idx"       ON "audit_logs" ("actor_id", "at");
CREATE INDEX "audit_logs_entity_entity_id_idx"  ON "audit_logs" ("entity", "entity_id");
CREATE INDEX "audit_logs_at_idx"                ON "audit_logs" ("at");
