-- Migration 003: make email uniqueness case-insensitive.
--
-- 'John@x.com' and 'john@x.com' are the same mailbox, but the original UNIQUE
-- constraint treated them as different accounts. The app lowercases on signup
-- and login, so a legacy mixed-case row can register but never sign in.
--
-- RUN scripts/check-duplicate-emails.mjs FIRST. If two accounts collide, this
-- migration stops with a clear message rather than guessing which to keep --
-- merging or deleting an account is your call, not a migration's.

BEGIN;

DO $$
DECLARE
    collisions TEXT;
BEGIN
    SELECT string_agg(dupe, ', ')
      INTO collisions
      FROM (
        SELECT LOWER(TRIM(email)) AS dupe
          FROM users
         GROUP BY LOWER(TRIM(email))
        HAVING COUNT(*) > 1
      ) x;

    IF collisions IS NOT NULL THEN
        RAISE EXCEPTION
            'Cannot normalize emails: these addresses exist more than once, differing only by capitalization: %. Run "node scripts/check-duplicate-emails.mjs" to see the accounts and decide which to keep, then re-run this migration.',
            collisions;
    END IF;
END $$;

UPDATE users
   SET email = LOWER(TRIM(email))
 WHERE email <> LOWER(TRIM(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

COMMIT;
