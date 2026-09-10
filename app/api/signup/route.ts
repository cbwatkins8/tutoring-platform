import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/session';
import { pool } from '@/lib/db';
import { withinRateLimit } from '@/lib/rate-limit';
import { isSiteFeatureEnabled } from '@/lib/site-features';

interface SignupRequest {
  parent_name: string;
  email: string;
  password: string;
  student_first_name: string;
  student_last_name: string;
  grade_level: string;
  subjects: string;
}

export async function POST(request: NextRequest) {
  // A single connection so all three writes share one transaction. Previously these
  // were three independent statements: if the third failed, the user and student
  // rows stayed behind as orphans and the email was permanently unusable.
  const client = await pool.connect();

  try {
    if (!(await isSiteFeatureEnabled('client_portal'))) {
      return NextResponse.json(
        { message: 'Online accounts are not available yet. Please request a consultation.' },
        { status: 403 }
      );
    }
    const body: SignupRequest = await request.json();
    const {
      parent_name,
      email,
      password,
      student_first_name,
      student_last_name,
      grade_level,
      subjects,
    } = body;

    if (
      !parent_name ||
      !email ||
      !password ||
      !student_first_name ||
      !student_last_name ||
      !grade_level
    ) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ message: 'Enter a valid email address' }, { status: 400 });
    }
    if (!(await withinRateLimit(request, 'signup', normalizedEmail, 5, 60))) {
      return NextResponse.json(
        { message: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, name, password_hash, role, created_at)
       VALUES ($1, $2, $3, 'parent', NOW())
       RETURNING id, email, name, role, session_version`,
      [normalizedEmail, parent_name, passwordHash]
    );

    const parentUser = userResult.rows[0];
    const parentUserId = parentUser.id;

    // grade_level is INT in the schema; coerce explicitly rather than relying on
    // Postgres to cast the string the form sends.
    const gradeInt = parseInt(grade_level, 10);
    if (!Number.isInteger(gradeInt) || gradeInt < 6 || gradeInt > 12) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Grade must be between 6 and 12' }, { status: 400 });
    }

    const studentResult = await client.query(
      `INSERT INTO students (first_name, last_name, grade_level, subjects, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [student_first_name, student_last_name, gradeInt, subjects || null]
    );

    const studentId = studentResult.rows[0].id;

    // Column is user_id, not guardian_id. student_guardians has no created_at.
    await client.query(
      `INSERT INTO student_guardians (student_id, user_id, relationship, primary_contact)
       VALUES ($1, $2, 'parent', TRUE)`,
      [studentId, parentUserId]
    );

    await client.query('COMMIT');

    const token = createSessionToken({
      userId: parentUserId,
      email: parentUser.email,
      role: parentUser.role,
      version: parentUser.session_version,
    });

    const response = NextResponse.json(
      {
        message: 'Signup successful',
        userId: parentUserId,
        studentId,
        email: parentUser.email,
        name: parentUser.name,
        role: parentUser.role,
      },
      { status: 201 }
    );
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return response;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
    }
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'An error occurred during signup' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
