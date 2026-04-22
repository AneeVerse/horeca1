CREATE TABLE push_subscriptions (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint)
);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
