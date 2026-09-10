import 'server-only';

import { pool } from './db';

export async function isAvailableStart(
  tutorId: number,
  scheduledAt: Date,
  excludeSessionId?: number
): Promise<boolean> {
  const { rows } = await pool.query(
    `WITH settings AS (
       SELECT id, timezone, slot_interval_minutes,
              ($2::timestamptz AT TIME ZONE timezone) AS local_start,
              (($2::timestamptz + INTERVAL '1 hour') AT TIME ZONE timezone) AS local_end
         FROM tutors
        WHERE id = $1
     )
     SELECT 1
       FROM settings st
      WHERE $2::timestamptz >= NOW() + INTERVAL '1 hour'
        AND $2::timestamptz < NOW() + INTERVAL '29 days'
        AND (
          EXISTS (
            SELECT 1
              FROM tutor_availability ta
             WHERE ta.tutor_id = st.id
               AND ta.available = TRUE
               AND ta.day_of_week = EXTRACT(DOW FROM st.local_start)::int
               AND st.local_start::time >= ta.start_time
               AND st.local_end::time <= ta.end_time
               AND MOD(
                     EXTRACT(EPOCH FROM (st.local_start::time - ta.start_time))::bigint,
                     st.slot_interval_minutes * 60
                   ) = 0
               AND NOT EXISTS (
                 SELECT 1 FROM tutor_availability_exceptions ex
                  WHERE ex.tutor_id = st.id
                    AND ex.exception_date = st.local_start::date
                    AND ex.available = FALSE
               )
          )
          OR EXISTS (
            SELECT 1
              FROM tutor_availability_exceptions ex
             WHERE ex.tutor_id = st.id
               AND ex.exception_date = st.local_start::date
               AND ex.available = TRUE
               AND st.local_start::time >= ex.start_time
               AND st.local_end::time <= ex.end_time
               AND MOD(
                     EXTRACT(EPOCH FROM (st.local_start::time - ex.start_time))::bigint,
                     st.slot_interval_minutes * 60
                   ) = 0
          )
        )
        AND NOT EXISTS (
          SELECT 1
            FROM sessions sess
           WHERE sess.tutor_id = st.id
             AND sess.status = 'scheduled'
             AND ($3::int IS NULL OR sess.id <> $3::int)
             AND tstzrange(
                   sess.scheduled_at,
                   sess.scheduled_at + make_interval(mins => sess.duration_minutes),
                   '[)'
                 ) && tstzrange($2::timestamptz, $2::timestamptz + INTERVAL '1 hour', '[)')
        )
      LIMIT 1`,
    [tutorId, scheduledAt.toISOString(), excludeSessionId ?? null]
  );

  return rows.length > 0;
}
