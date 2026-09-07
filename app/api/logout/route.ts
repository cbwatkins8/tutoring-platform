import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, SESSION_COOKIE_NAME } from '@/lib/session';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (session) {
    await pool.query(
      `UPDATE users
          SET session_version = session_version + 1, updated_at = NOW()
        WHERE id = $1 AND session_version = $2`,
      [session.userId, session.version]
    );
  }

  const response = NextResponse.json({ message: 'Signed out' });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
