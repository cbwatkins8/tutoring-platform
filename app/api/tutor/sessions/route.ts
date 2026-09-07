import { NextRequest, NextResponse } from 'next/server';
import { pool, verifiedSessionFromRequest } from '@/lib/access';

export async function GET(request: NextRequest) {
  try {
    // Signature-verified: a forged or edited token fails here.
    const decoded = await verifiedSessionFromRequest(request);
    if (!decoded) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Enforce the role server-side. Previously this was only checked in the
    // browser, so any signed-in parent could read every student's schedule.
    if (decoded.role !== 'tutor') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // The token carries a users.id, but sessions.tutor_id holds a tutors.id.
    // Join through tutors instead of comparing the two directly.
    const sessionsResult = await pool.query(
      `SELECT
        sess.id,
        sess.subject,
        sess.grade_at_time,
        sess.scheduled_at,
        sess.status,
        sess.zoom_join_url,
        sess.notes,
        s.id AS student_id,
        s.first_name || ' ' || s.last_name AS student_name
       FROM sessions sess
       JOIN students s ON sess.student_id = s.id
       JOIN tutors t ON sess.tutor_id = t.id
       WHERE t.user_id = $1
       ORDER BY sess.scheduled_at DESC`,
      [decoded.userId]
    );

    return NextResponse.json({ sessions: sessionsResult.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tutor sessions:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
