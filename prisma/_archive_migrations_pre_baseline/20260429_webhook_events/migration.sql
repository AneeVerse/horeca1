-- Idempotency table for incoming provider webhooks (Razorpay etc.)
CREATE TABLE "webhook_events" (
    "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
    "provider"          VARCHAR(20)  NOT NULL,
    "provider_event_id" VARCHAR(100) NOT NULL,
    "event"             VARCHAR(60)  NOT NULL,
    "received_at"       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");
CREATE INDEX "webhook_events_event_idx" ON "webhook_events"("event");
