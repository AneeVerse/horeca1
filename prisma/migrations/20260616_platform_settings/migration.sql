-- Global, single-row platform configuration edited from the admin Settings page.
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "platform_name" VARCHAR(120) NOT NULL DEFAULT 'HoReCa1',
    "contact_email" VARCHAR(255),
    "support_phone" VARCHAR(30),
    "default_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "min_order_value" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "free_delivery_threshold" DECIMAL(10,2) NOT NULL DEFAULT 2000,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
