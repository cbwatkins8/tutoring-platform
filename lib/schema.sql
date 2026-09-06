CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('parent', 'tutor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    bio TEXT,
    subjects TEXT,
    grades_teach TEXT,
    hourly_rate DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    grade_level INT,
    school_name VARCHAR(255),
    academic_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_guardians (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    user_id INTEGER REFERENCES users(id),
    relationship VARCHAR(50),
    primary_contact BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20)
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    tutor_id INTEGER REFERENCES tutors(id),
    subject VARCHAR(100),
    grade_at_time INT,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 60,
    zoom_meeting_id VARCHAR(255),
    zoom_join_url TEXT,
    student_attended BOOLEAN DEFAULT NULL,
    tutor_attended BOOLEAN DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_reports (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    topic_covered VARCHAR(255),
    understanding_score INT CHECK (understanding_score BETWEEN 1 AND 5),
    tutor_notes TEXT,
    next_steps TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id INTEGER REFERENCES sessions(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_id ON students(id);
CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_session_reports_session_id ON session_reports(session_id);
