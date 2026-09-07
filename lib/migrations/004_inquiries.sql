-- Migration 004: consultation requests from the public contact form.
-- Non-destructive, idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    parent_name     VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    student_name    VARCHAR(255),
    grade_level     INT,
    subject         VARCHAR(255),
    message         TEXT,
    referral_source VARCHAR(255),
    status          VARCHAR(50) DEFAULT 'new'
                    CHECK (status IN ('new', 'contacted', 'scheduled', 'closed')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

COMMIT;
