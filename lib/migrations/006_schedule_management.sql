-- Tutor-managed availability, configurable start intervals, and date exceptions.

BEGIN;

ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS slot_interval_minutes INTEGER NOT NULL DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tutors_slot_interval_check') THEN
    ALTER TABLE tutors
      ADD CONSTRAINT tutors_slot_interval_check
      CHECK (slot_interval_minutes IN (15, 30, 60));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tutor_availability_exceptions (
  id SERIAL PRIMARY KEY,
  tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  available BOOLEAN NOT NULL,
  start_time TIME,
  end_time TIME,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (available = FALSE AND start_time IS NULL AND end_time IS NULL)
    OR
    (available = TRUE AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_exception_closed_day
  ON tutor_availability_exceptions(tutor_id, exception_date)
  WHERE available = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tutor_exception_extra_window
  ON tutor_availability_exceptions(tutor_id, exception_date, start_time, end_time)
  WHERE available = TRUE;

CREATE INDEX IF NOT EXISTS idx_tutor_exceptions_date
  ON tutor_availability_exceptions(tutor_id, exception_date);

COMMIT;
