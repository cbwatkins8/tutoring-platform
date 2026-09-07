import { NextRequest, NextResponse } from 'next/server';
import { pool, studentsFor, verifiedSessionFromRequest } from '@/lib/access';

/** GET /api/students -> every student on this account. */
export async function GET(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ students: await studentsFor(session) }, { status: 200 });
  } catch (error) {
    console.error('Error listing students:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}

/** POST /api/students -> add another child to this parent account. */
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'parent') {
      return NextResponse.json(
        { message: 'Only parent accounts can add students' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { first_name, last_name, grade_level, subjects, school_name } = body;

    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json(
        { message: 'First and last name are required' },
        { status: 400 }
      );
    }

    const grade = grade_level === undefined || grade_level === null || grade_level === ''
      ? null
      : parseInt(String(grade_level), 10);

    if (grade !== null && (isNaN(grade) || grade < 6 || grade > 12)) {
      return NextResponse.json({ message: 'Grade must be between 6 and 12' }, { status: 400 });
    }

    // Don't silently create a duplicate if a form is submitted twice.
    const dupe = await client.query(
      `SELECT s.id FROM students s
         JOIN student_guardians sg ON s.id = sg.student_id
        WHERE sg.user_id = $1
          AND LOWER(s.first_name) = LOWER($2)
          AND LOWER(s.last_name) = LOWER($3)`,
      [session.userId, first_name.trim(), last_name.trim()]
    );

    if (dupe.rows.length > 0) {
      return NextResponse.json(
        { message: `${first_name.trim()} ${last_name.trim()} is already on your account` },
        { status: 409 }
      );
    }

    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO students (first_name, last_name, grade_level, subjects, school_name, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        first_name.trim(),
        last_name.trim(),
        grade,
        subjects || null,
        school_name?.trim() || null,
      ]
    );

    await client.query(
      `INSERT INTO student_guardians (student_id, user_id, relationship, primary_contact)
       VALUES ($1, $2, 'parent', FALSE)`,
      [inserted.rows[0].id, session.userId]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'Student added', student: { ...inserted.rows[0], has_login: false } },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Error adding student:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  } finally {
    client.release();
  }
}
