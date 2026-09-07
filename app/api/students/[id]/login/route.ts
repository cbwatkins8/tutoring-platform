import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool, studentFor, verifiedSessionFromRequest } from '@/lib/access';
import { withinRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/students/[id]/login
 * Body: { email, password }
 *
 * A parent gives one of their children their own sign-in. Creates a users row
 * with role 'student' and links it to the student record. Re-posting for a
 * student who already has a login resets that password.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'parent') {
      return NextResponse.json(
        { message: 'Only a parent can create a student login' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const student = await studentFor(session, Number(id));
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    const guardian = await client.query(
      `SELECT primary_contact
         FROM student_guardians
        WHERE student_id = $1 AND user_id = $2`,
      [student.id, session.userId]
    );
    if (!guardian.rows[0]?.primary_contact) {
      return NextResponse.json(
        { message: 'Only the primary parent can manage this student login' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!(await withinRateLimit(request, 'student-login', String(session.userId), 10, 60))) {
      return NextResponse.json(
        { message: 'Too many account changes. Please try again later.' },
        { status: 429 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'That does not look like a valid email address' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    // Already has a login: treat this as a password reset.
    if (student.user_id) {
      const owner = await client.query(
        `SELECT id, email FROM users WHERE id = $1`,
        [student.user_id]
      );

      if (owner.rows.length > 0 && owner.rows[0].email !== email) {
        const clash = await client.query(
          `SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2`,
          [email, student.user_id]
        );
        if (clash.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { message: 'Another account already uses that email' },
            { status: 409 }
          );
        }
      }

      await client.query(
        `UPDATE users
            SET email = $1,
                password_hash = $2,
                session_version = session_version + 1,
                updated_at = NOW()
          WHERE id = $3`,
        [email, hash, student.user_id]
      );
      await client.query('COMMIT');

      return NextResponse.json(
        { message: `Sign-in updated for ${student.first_name}`, email, reset: true },
        { status: 200 }
      );
    }

    const clash = await client.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email]);
    if (clash.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'That email is already registered' },
        { status: 409 }
      );
    }

    const created = await client.query(
      `INSERT INTO users (email, name, password_hash, role, created_at)
       VALUES ($1, $2, $3, 'student', NOW())
       RETURNING id`,
      [email, `${student.first_name} ${student.last_name}`, hash]
    );

    await client.query(
      `UPDATE students SET user_id = $1, updated_at = NOW() WHERE id = $2`,
      [created.rows[0].id, student.id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { message: `${student.first_name} can now sign in`, email, reset: false },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Error creating student login:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  } finally {
    client.release();
  }
}
