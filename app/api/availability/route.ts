import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

interface ConcreteSlot {
  tutor_id: number;
  timezone: string;
  scheduled_at: Date | string;
}

export async function GET() {
  try {
    const { rows } = await pool.query<ConcreteSlot>(
      `WITH recurring AS (
         SELECT t.id AS tutor_id,
                t.timezone,
                day_value::date AS local_date,
                ta.start_time,
                ta.end_time
           FROM tutors t
           JOIN tutor_availability ta ON ta.tutor_id = t.id AND ta.available = TRUE
           CROSS JOIN LATERAL generate_series(
             (NOW() AT TIME ZONE t.timezone)::date,
             (NOW() AT TIME ZONE t.timezone)::date + 28,
             INTERVAL '1 day'
           ) AS day_value
          WHERE EXTRACT(DOW FROM day_value)::int = ta.day_of_week
       ), candidates AS (
         SELECT r.tutor_id,
                r.timezone,
                ((r.local_date + r.start_time) AT TIME ZONE r.timezone)
                  + (slot_number * INTERVAL '1 hour') AS scheduled_at
           FROM recurring r
           CROSS JOIN LATERAL generate_series(
             0,
             GREATEST(
               0,
               FLOOR(EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600)::int - 1
             )
           ) AS slot_number
          WHERE r.end_time > r.start_time
       )
       SELECT c.tutor_id, c.timezone, c.scheduled_at
         FROM candidates c
        WHERE c.scheduled_at >= NOW() + INTERVAL '1 hour'
          AND NOT EXISTS (
            SELECT 1
              FROM sessions s
             WHERE s.tutor_id = c.tutor_id
               AND s.status = 'scheduled'
               AND tstzrange(
                     s.scheduled_at,
                     s.scheduled_at + make_interval(mins => s.duration_minutes),
                     '[)'
                   ) && tstzrange(c.scheduled_at, c.scheduled_at + INTERVAL '1 hour', '[)')
          )
        ORDER BY c.scheduled_at, c.tutor_id
        LIMIT 200`
    );

    return NextResponse.json({
      slots: rows.map((row) => ({
        tutor_id: row.tutor_id,
        timezone: row.timezone,
        scheduled_at:
          row.scheduled_at instanceof Date
            ? row.scheduled_at.toISOString()
            : new Date(row.scheduled_at).toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ message: 'Could not load availability' }, { status: 500 });
  }
}
