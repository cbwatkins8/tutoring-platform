-- Migration 001: add objects the application code references but schema.sql never created.
-- Safe to run against an existing database. Non-destructive: no drops, no data loss.

BEGIN;

-- 1. tutor_availability: queried by /api/availability and written by scripts/setup-tutor.ts,
--    but this table was never in schema.sql at all.
CREATE TABLE IF NOT EXISTS tutor_availability (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutors(id) ON DELETE CASCADE,
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. students.subjects: the signup form collects subject choices and the API
--    accepted them, but there was no column, so every selection was discarded.
ALTER TABLE students ADD COLUMN IF NOT EXISTS subjects TEXT;

-- 3. sessions.notes: the booking form collects notes and the API accepted them,
--    but the INSERT had nowhere to put them, so they were silently dropped.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Every guardian lookup filters on student_guardians.user_id; index it.
CREATE INDEX IF NOT EXISTS idx_student_guardians_user_id ON student_guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student_id ON student_guardians(student_id);

-- 5. Prevent linking the same guardian to the same student twice.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_guardians_unique_pair'
    ) THEN
        ALTER TABLE student_guardians
            ADD CONSTRAINT student_guardians_unique_pair UNIQUE (student_id, user_id);
    END IF;
END $$;

-- 6. Index for the tutor dashboard's session lookup.
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions(tutor_id);

COMMIT;
