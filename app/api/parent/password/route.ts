import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool, verifiedSessionFromRequest } from '@/lib/access';
import { withinRateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE_NAME } from '@/lib/session';

/** POST /api/parent/password -> change own password. Requires the current one. */
export async function POST(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { current_password, new_password } = await request.json();

    if (!(await withinRateLimit(request, 'password-change', String(session.userId), 10, 60))) {
      return NextResponse.json(
        { message: 'Too many password attempts. Please try again later.' },
        { status: 429 }
      );
    }

    if (!current_password || !new_password) {
      return NextResponse.json(
        { message: 'Both the current and new password are required' },
        { status: 400 }
      );
    }

    if (String(new_password).length < 8) {
      return NextResponse.json(
        { message: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Always require the current password, so a borrowed browser tab cannot be
    // used to lock the real owner out of their account.
    const ok = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!ok) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    await pool.query(
      `UPDATE users
          SET password_hash = $1,
              session_version = session_version + 1,
              updated_at = NOW()
        WHERE id = $2`,
      [await bcrypt.hash(String(new_password), 10), session.userId]
    );

    const response = NextResponse.json(
      { message: 'Password changed. Please sign in again.' },
      { status: 200 }
    );
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Error changing password:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
