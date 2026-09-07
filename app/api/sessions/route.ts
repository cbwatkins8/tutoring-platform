import { NextRequest, NextResponse } from 'next/server';
import { pool, studentsFor, verifiedSessionFromRequest } from '@/lib/access';

/**
 * GET /api/sessions              -> sessions for every student on the account
 * GET /api/sessions?student_id=1 -> just that child's
 *
 * Each row carries student_name so a parent with several children can tell
 * whose session is whose.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const mine = await studentsFor(session);
    if (mine.length === 0) {
      return NextResponse.json({ sessions: [] }, { status: 200 });
    }

    const filterParam = request.nextUrl.searchParams.get('student_id');
    let ids = mine.map((s) => s.id);

    if (filterParam) {
      const wanted = Number(filterParam);
      if (!ids.includes(wanted)) {
        return NextResponse.json({ message: 'Student not found' }, { status: 404 });
      }
      ids = [wanted];
    }

    const { rows } = await pool.query(
      `SELECT
         sess.id,
         sess.subject,
         sess.scheduled_at,
         sess.status,
         sess.zoom_join_url,
         sess.notes,
         sess.student_id,
         s.first_name || ' ' || s.last_name AS student_name
       FROM sessions sess
       JOIN students s ON sess.student_id = s.id
      WHERE sess.student_id = ANY($1::int[])
      ORDER BY sess.scheduled_at DESC`,
      [ids]
    );

    return NextResponse.json({ sessions: rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
