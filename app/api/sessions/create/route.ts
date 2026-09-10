import { NextRequest, NextResponse } from 'next/server';
import { pool, studentFor, verifiedSessionFromRequest } from '@/lib/access';
import { withinRateLimit } from '@/lib/rate-limit';
import { SUBJECT_OPTIONS } from '@/lib/student-options';
import { isAvailableStart } from '@/lib/scheduling';
import { isSiteFeatureEnabled } from '@/lib/site-features';

/**
 * POST /api/sessions/create
 * Body: { subject, scheduled_at, notes?, student_id? }
 *
 * A parent books for any of their children (student_id picks which; omitting it
 * uses the first). A student books for themselves.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSiteFeatureEnabled('online_booking'))) {
      return NextResponse.json({ message: 'Online booking is not available yet' }, { status: 403 });
    }

    const { subject, scheduled_at, notes, student_id, tutor_id } = await request.json();

    if (!subject || !scheduled_at || !Number.isInteger(Number(tutor_id))) {
      return NextResponse.json(
        { message: 'Subject and an available time are required' },
        { status: 400 }
      );
    }
    if (!SUBJECT_OPTIONS.includes(subject as (typeof SUBJECT_OPTIONS)[number])) {
      return NextResponse.json({ message: 'Choose a supported subject' }, { status: 400 });
    }
    if (!(await withinRateLimit(request, 'booking', String(session.userId), 20, 60))) {
      return NextResponse.json(
        { message: 'Too many booking attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const when = new Date(scheduled_at);
    if (isNaN(when.getTime())) {
      return NextResponse.json({ message: 'Invalid date or time' }, { status: 400 });
    }
    if (when.getTime() < Date.now()) {
      return NextResponse.json(
        { message: 'Cannot book a session in the past' },
        { status: 400 }
      );
    }

    // Resolves only among students this caller owns, so passing another
    // family's id returns 404 rather than booking against their child.
    const student = await studentFor(session, student_id ?? null);
    if (!student) {
      return NextResponse.json(
        { message: 'No student found for this account' },
        { status: 404 }
      );
    }

    const tutorId = Number(tutor_id);
    if (!(await isAvailableStart(tutorId, when))) {
      return NextResponse.json(
        { message: 'That time is outside the tutor’s availability.' },
        { status: 409 }
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO sessions (
         student_id, tutor_id, subject, grade_at_time,
         scheduled_at, notes, status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', NOW())
       RETURNING id, scheduled_at, student_id`,
      [student.id, tutorId, subject, student.grade_level, when.toISOString(), notes || null]
    );

    return NextResponse.json(
      {
        message: 'Session booked successfully',
        session: { ...rows[0], student_name: `${student.first_name} ${student.last_name}` },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    if ((error as { code?: string }).code === '23P01') {
      return NextResponse.json(
        { message: 'That time was just booked. Please choose another.' },
        { status: 409 }
      );
    }
    console.error('Error creating session:', error);
    return NextResponse.json(
      { message: 'An error occurred while booking the session' },
      { status: 500 }
    );
  }
}
