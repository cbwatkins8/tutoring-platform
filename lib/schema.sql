CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('parent', 'tutor', 'admin', 'student')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    session_version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tutors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    bio TEXT,
    subjects TEXT,
    grades_teach TEXT,
    hourly_rate DECIMAL(10, 2),
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes IN (15, 30, 60)),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    grade_level INT,
    school_name VARCHAR(255),
    academic_notes TEXT,
    subjects TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

CREATE TABLE student_guardians (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship VARCHAR(50),
    primary_contact BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    UNIQUE (student_id, user_id)
);

CREATE TABLE tutor_availability (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tutor_id, day_of_week, start_time, end_time),
    CHECK (end_time > start_time)
);

CREATE TABLE tutor_availability_exceptions (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    available BOOLEAN NOT NULL,
    start_time TIME,
    end_time TIME,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    tutor_id INTEGER NOT NULL REFERENCES tutors(id),
    subject VARCHAR(100) NOT NULL,
    grade_at_time INT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 240),
    zoom_meeting_id VARCHAR(255),
    zoom_join_url TEXT,
    student_attended BOOLEAN DEFAULT NULL,
    tutor_attended BOOLEAN DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_reports (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    topic_covered VARCHAR(255),
    understanding_score INT CHECK (understanding_score BETWEEN 1 AND 5),
    tutor_notes TEXT,
    next_steps TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id INTEGER REFERENCES sessions(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inquiries (
    id SERIAL PRIMARY KEY,
    parent_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    student_name VARCHAR(255),
    grade_level INT,
    subject VARCHAR(255),
    message TEXT,
    referral_source VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'closed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE request_rate_limits (
    action TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_count INT NOT NULL DEFAULT 1,
    PRIMARY KEY (action, key_hash)
);

CREATE TABLE site_features (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_sessions_tutor_id ON sessions(tutor_id);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_session_reports_session_id ON session_reports(session_id);
CREATE INDEX idx_student_guardians_user_id ON student_guardians(user_id);
CREATE INDEX idx_student_guardians_student_id ON student_guardians(student_id);
CREATE UNIQUE INDEX idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX idx_request_rate_limits_window ON request_rate_limits(window_start);
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));

ALTER TABLE sessions ADD CONSTRAINT sessions_tutor_no_overlap
  EXCLUDE USING gist (
    tutor_id WITH =,
    tsrange(
      scheduled_at AT TIME ZONE 'UTC',
      (scheduled_at AT TIME ZONE 'UTC') + duration_minutes * INTERVAL '1 minute',
      '[)'
    ) WITH &&
  ) WHERE (status = 'scheduled');

ALTER TABLE sessions ADD CONSTRAINT sessions_student_no_overlap
  EXCLUDE USING gist (
    student_id WITH =,
    tsrange(
      scheduled_at AT TIME ZONE 'UTC',
      (scheduled_at AT TIME ZONE 'UTC') + duration_minutes * INTERVAL '1 minute',
      '[)'
    ) WITH &&
  ) WHERE (status = 'scheduled');
