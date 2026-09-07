import { NextRequest, NextResponse } from 'next/server';
import { pool, studentFor, canEditStudent, verifiedSessionFromRequest } from '@/lib/access';

/**
 * PATCH /api/student/update
 * Body: { school_name?, academic_notes?, grade_level?, subjects?, student_id? }
 * Without student_id, updates the first student (previous behaviour).
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { school_name, academic_notes, grade_level, subjects, student_id } = body;

    const target = await studentFor(session, student_id ?? null);
    if (!target) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (!(await canEditStudent(session, target.id))) {
      return NextResponse.json(
        { message: 'Only a parent on this account can change student details' },
        { status: 403 }
      );
    }

    let grade = target.grade_level;
    if (grade_level !== undefined && grade_level !== null && grade_level !== '') {
      const parsed = parseInt(String(grade_level), 10);
      if (isNaN(parsed) || parsed < 6 || parsed > 12) {
        return NextResponse.json(
          { message: 'Grade must be between 6 and 12' },
          { status: 400 }
        );
      }
      grade = parsed;
    }

    // COALESCE on the parameter, not the column: an omitted field keeps its
    // current value, while an explicit empty string clears it.
    const { rows } = await pool.query(
      `UPDATE students
          SET school_name    = $1,
              academic_notes = $2,
              grade_level    = $3,
              subjects       = $4,
              updated_at     = NOW()
        WHERE id = $5
        RETURNING *`,
      [
        school_name === undefined ? target.school_name : school_name || null,
        academic_notes === undefined ? target.academic_notes : academic_notes || null,
        grade,
        subjects === undefined ? target.subjects : subjects || null,
        target.id,
      ]
    );

    return NextResponse.json(
      { message: 'Profile updated successfully', student: rows[0] },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Error updating student:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
