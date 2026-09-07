import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { pool, verifiedSessionFromRequest } from '@/lib/access';

/** GET /api/parent -> the signed-in account's own profile. */
export async function GET(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT id, email, name, role, created_at FROM users WHERE id = $1`,
      [session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}

/** PATCH /api/parent -> update own name and/or email. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, email } = await request.json();

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ message: 'Name cannot be empty' }, { status: 400 });
    }

    let nextEmail: string | undefined;
    if (email !== undefined) {
      nextEmail = String(email).trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json(
          { message: 'That does not look like a valid email address' },
          { status: 400 }
        );
      }

      const taken = await pool.query(
        `SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2`,
        [nextEmail, session.userId]
      );

      if (taken.rows.length > 0) {
        return NextResponse.json(
          { message: 'Another account already uses that email' },
          { status: 409 }
        );
      }
    }

    const { rows } = await pool.query(
      `UPDATE users
          SET name       = COALESCE($1, name),
              email      = COALESCE($2, email),
              updated_at = NOW(),
              session_version = session_version +
                CASE WHEN $2::text IS NOT NULL AND $2::text <> email THEN 1 ELSE 0 END
        WHERE id = $3
        RETURNING id, email, name, role`,
      [name === undefined ? null : String(name).trim(), nextEmail ?? null, session.userId]
    );

    // The token embeds the email, so a changed address means a stale token.
    const emailChanged = nextEmail !== undefined && nextEmail !== session.email;

    const response = NextResponse.json(
      {
        message: 'Profile updated',
        profile: rows[0],
        reloginRequired: emailChanged,
      },
      { status: 200 }
    );
    if (emailChanged) {
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Error updating profile:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
