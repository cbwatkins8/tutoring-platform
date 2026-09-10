-- Feature flags let the public launch stay minimal while completed application
-- features remain intact and can be enabled later from the admin interface.

BEGIN;

CREATE TABLE IF NOT EXISTS site_features (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_features (key, enabled) VALUES
  ('client_portal', FALSE),
  ('online_booking', FALSE)
ON CONFLICT (key) DO NOTHING;

COMMIT;
