-- Migration 002: student login accounts + parent profile support.
-- Non-destructive, idempotent, and touches NO existing row data.
--
-- Email case-normalization used to live here. It was moved to 003 because it
-- can collide when two accounts differ only by capitalization, and that is a
-- decision for a human, not a migration.

BEGIN;

-- 1. users.role only permitted ('parent','tutor','admin'). Students need a role
--    of their own, so widen the CHECK constraint.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('parent', 'tutor', 'admin', 'student'));

-- 2. Link a student record to a login account. Nullable: a student may exist
--    for years before anyone gives them a password, and many never will.
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- One login belongs to at most one student record.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id
    ON students(user_id) WHERE user_id IS NOT NULL;

-- 3. Track profile edits.
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

COMMIT;
