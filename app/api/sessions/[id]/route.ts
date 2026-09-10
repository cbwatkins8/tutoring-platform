import { NextRequest, NextResponse } from 'next/server';
import { pool, studentsFor, verifiedSessionFromRequest } from '@/lib/access';
import { isAvailableStart } from '@/lib/scheduling';
import { isSiteFeatureEnabled } from '@/lib/site-features';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifiedSessionFromRequest(request);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id: rawId } = await context.params;
    const sessionId = Number(rawId);
    if (!Number.isInteger(sessionId)) {
      return NextResponse.json({ message: 'Invalid session' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT sess.*, t.user_id AS tutor_user_id,
              s.first_name || ' ' || s.last_name AS student_name
         FROM sessions sess
         JOIN tutors t ON t.id = sess.tutor_id
         JOIN students s ON s.id = sess.student_id
        WHERE sess.id = $1`,
      [sessionId]
    );
    const booked = rows[0];
    if (!booked) return NextResponse.json({ message: 'Session not found' }, { status: 404 });

    const tutorOwns = auth.role === 'tutor' && Number(booked.tutor_user_id) === auth.userId;
    const studentIds = auth.role === 'parent' || auth.role === 'student'
      ? (await studentsFor(auth)).map((student) => student.id)
      : [];
    const familyOwns = studentIds.includes(Number(booked.student_id));
    if (!tutorOwns && !familyOwns) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }
    if (familyOwns && !(await isSiteFeatureEnabled('online_booking'))) {
      return NextResponse.json({ message: 'Online session changes are not available yet' }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'cancel') {
      if (booked.status !== 'scheduled') {
        return NextResponse.json({ message: 'Only scheduled sessions can be cancelled' }, { status: 409 });
      }
      const { rows: updated } = await pool.query(
        `UPDATE sessions
            SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1
          WHERE id = $2 AND status = 'scheduled'
          RETURNING id, student_id, subject, scheduled_at, status, cancellation_reason`,
        [String(body.reason || '').trim() || null, sessionId]
      );
      return NextResponse.json({ message: 'Session cancelled', session: updated[0] });
    }

    if (action === 'complete') {
      if (!tutorOwns) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      if (booked.status !== 'scheduled') {
        return NextResponse.json({ message: 'Only scheduled sessions can be completed' }, { status: 409 });
      }
      const { rows: updated } = await pool.query(
        `UPDATE sessions SET status = 'completed'
          WHERE id = $1 AND status = 'scheduled'
          RETURNING id, student_id, subject, scheduled_at, status`,
        [sessionId]
      );
      return NextResponse.json({ message: 'Session marked complete', session: updated[0] });
    }

    if (action === 'reschedule') {
      if (booked.status !== 'scheduled') {
        return NextResponse.json({ message: 'Only scheduled sessions can be rescheduled' }, { status: 409 });
      }
      const when = new Date(body.scheduled_at);
      if (Number.isNaN(when.getTime())) {
        return NextResponse.json({ message: 'Choose a valid available time' }, { status: 400 });
      }
      if (!(await isAvailableStart(Number(booked.tutor_id), when, sessionId))) {
        return NextResponse.json({ message: 'That time is no longer available' }, { status: 409 });
      }
      const { rows: updated } = await pool.query(
        `UPDATE sessions
            SET scheduled_at = $1, cancelled_at = NULL, cancellation_reason = NULL
          WHERE id = $2 AND status = 'scheduled'
          RETURNING id, student_id, subject, scheduled_at, status`,
        [when.toISOString(), sessionId]
      );
      return NextResponse.json({ message: 'Session rescheduled', session: updated[0] });
    }

    return NextResponse.json({ message: 'Unknown session action' }, { status: 400 });
  } catch (error) {
    if ((error as { code?: string }).code === '23P01') {
      return NextResponse.json({ message: 'That time was just booked. Please choose another.' }, { status: 409 });
    }
    console.error('Error updating session:', error);
    return NextResponse.json({ message: 'Could not update session' }, { status: 500 });
  }
}
