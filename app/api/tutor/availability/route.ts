import { NextRequest, NextResponse } from 'next/server';
import { pool, verifiedSessionFromRequest } from '@/lib/access';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const INTERVALS = [15, 30, 60];

async function tutorFor(request: NextRequest) {
  const session = await verifiedSessionFromRequest(request);
  if (!session) return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  if (session.role !== 'tutor') return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  const { rows } = await pool.query(
    'SELECT id, timezone, slot_interval_minutes FROM tutors WHERE user_id = $1',
    [session.userId]
  );
  if (!rows[0]) return { error: NextResponse.json({ message: 'Tutor profile not found' }, { status: 404 }) };
  return { tutor: rows[0] };
}

export async function GET(request: NextRequest) {
  try {
    const result = await tutorFor(request);
    if (result.error) return result.error;
    const tutor = result.tutor;

    const [weekly, exceptions] = await Promise.all([
      pool.query(
        `SELECT id, day_of_week, start_time::text, end_time::text, available
           FROM tutor_availability WHERE tutor_id = $1 ORDER BY day_of_week, start_time`,
        [tutor.id]
      ),
      pool.query(
        `SELECT id, exception_date::text, available, start_time::text, end_time::text, note
           FROM tutor_availability_exceptions
          WHERE tutor_id = $1 AND exception_date >= CURRENT_DATE
          ORDER BY exception_date, start_time NULLS FIRST`,
        [tutor.id]
      ),
    ]);

    return NextResponse.json({
      timezone: tutor.timezone,
      slot_interval_minutes: tutor.slot_interval_minutes,
      weekly: weekly.rows,
      exceptions: exceptions.rows,
    });
  } catch (error) {
    console.error('Error reading tutor availability:', error);
    return NextResponse.json({ message: 'Could not load availability' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const result = await tutorFor(request);
    if (result.error) return result.error;
    const tutor = result.tutor;
    const body = await request.json();
    const interval = Number(body.slot_interval_minutes);
    const timezone = String(body.timezone || '');
    const weekly = Array.isArray(body.weekly) ? body.weekly : [];
    const exceptions = Array.isArray(body.exceptions) ? body.exceptions : [];

    if (!INTERVALS.includes(interval)) {
      return NextResponse.json({ message: 'Choose a 15, 30 or 60 minute interval' }, { status: 400 });
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      return NextResponse.json({ message: 'Choose a valid time zone' }, { status: 400 });
    }

    for (const row of weekly) {
      if (!Number.isInteger(Number(row.day_of_week)) || Number(row.day_of_week) < 0 || Number(row.day_of_week) > 6 ||
          !TIME_RE.test(String(row.start_time)) || !TIME_RE.test(String(row.end_time)) || row.end_time <= row.start_time) {
        return NextResponse.json({ message: 'One or more weekly availability windows are invalid' }, { status: 400 });
      }
    }
    for (const ex of exceptions) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ex.exception_date))) {
        return NextResponse.json({ message: 'One or more exception dates are invalid' }, { status: 400 });
      }
      if (ex.available && (!TIME_RE.test(String(ex.start_time)) || !TIME_RE.test(String(ex.end_time)) || ex.end_time <= ex.start_time)) {
        return NextResponse.json({ message: 'Added availability needs a valid start and end time' }, { status: 400 });
      }
    }

    await client.query('BEGIN');
    await client.query(
      'UPDATE tutors SET timezone = $1, slot_interval_minutes = $2 WHERE id = $3',
      [timezone, interval, tutor.id]
    );
    await client.query('DELETE FROM tutor_availability WHERE tutor_id = $1', [tutor.id]);
    for (const row of weekly) {
      await client.query(
        `INSERT INTO tutor_availability (tutor_id, day_of_week, start_time, end_time, available)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [tutor.id, Number(row.day_of_week), row.start_time, row.end_time]
      );
    }
    await client.query('DELETE FROM tutor_availability_exceptions WHERE tutor_id = $1 AND exception_date >= CURRENT_DATE', [tutor.id]);
    for (const ex of exceptions) {
      await client.query(
        `INSERT INTO tutor_availability_exceptions
           (tutor_id, exception_date, available, start_time, end_time, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tutor.id, ex.exception_date, Boolean(ex.available), ex.available ? ex.start_time : null, ex.available ? ex.end_time : null, ex.note || null]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Availability saved' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error saving tutor availability:', error);
    return NextResponse.json({ message: 'Could not save availability' }, { status: 500 });
  } finally {
    client.release();
  }
}
