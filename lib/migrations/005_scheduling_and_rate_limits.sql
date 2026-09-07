-- Migration 005: timezone-safe scheduling, database-enforced booking conflicts,
-- and a small shared rate-limit store for public/authenticated mutations.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Chicago';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'sessions'
       AND column_name = 'scheduled_at'
       AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE sessions
      ALTER COLUMN scheduled_at TYPE TIMESTAMPTZ
      USING scheduled_at AT TIME ZONE 'UTC';
  END IF;
END $$;

ALTER TABLE sessions ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN tutor_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN subject SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN duration_minutes SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_duration_positive') THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_duration_positive CHECK (duration_minutes > 0 AND duration_minutes <= 240);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_status_check') THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_tutor_no_overlap') THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_tutor_no_overlap
      EXCLUDE USING gist (
        tutor_id WITH =,
        tsrange(
          scheduled_at AT TIME ZONE 'UTC',
          (scheduled_at AT TIME ZONE 'UTC') + duration_minutes * INTERVAL '1 minute',
          '[)'
        ) WITH &&
      ) WHERE (status = 'scheduled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_student_no_overlap') THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_student_no_overlap
      EXCLUDE USING gist (
        student_id WITH =,
        tsrange(
          scheduled_at AT TIME ZONE 'UTC',
          (scheduled_at AT TIME ZONE 'UTC') + duration_minutes * INTERVAL '1 minute',
          '[)'
        ) WITH &&
      ) WHERE (status = 'scheduled');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_availability_unique
  ON tutor_availability(tutor_id, day_of_week, start_time, end_time);

CREATE TABLE IF NOT EXISTS request_rate_limits (
  action       TEXT NOT NULL,
  key_hash     TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (action, key_hash)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_window
  ON request_rate_limits(window_start);

COMMIT;
