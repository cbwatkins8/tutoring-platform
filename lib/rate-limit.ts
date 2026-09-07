import 'server-only';

import crypto from 'crypto';
import { pool } from './db';

function requestKey(request: Request, discriminator = ''): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  return crypto.createHash('sha256').update(`${ip}|${discriminator}`).digest('hex');
}

export async function withinRateLimit(
  request: Request,
  action: string,
  discriminator: string,
  maximum: number,
  windowMinutes: number
): Promise<boolean> {
  const keyHash = requestKey(request, discriminator);
  const { rows } = await pool.query<{ request_count: number }>(
    `INSERT INTO request_rate_limits (action, key_hash, window_start, request_count)
     VALUES ($1, $2, NOW(), 1)
     ON CONFLICT (action, key_hash) DO UPDATE
       SET window_start = CASE
             WHEN request_rate_limits.window_start <= NOW() - make_interval(mins => $3)
             THEN NOW()
             ELSE request_rate_limits.window_start
           END,
           request_count = CASE
             WHEN request_rate_limits.window_start <= NOW() - make_interval(mins => $3)
             THEN 1
             ELSE request_rate_limits.request_count + 1
           END
     RETURNING request_count`,
    [action, keyHash, windowMinutes]
  );

  return rows[0].request_count <= maximum;
}
