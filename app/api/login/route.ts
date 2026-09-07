import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/session';
import { pool } from '@/lib/db';
import { withinRateLimit } from '@/lib/rate-limit';

interface LoginRequest {
  email: string;
  password: string;
}

interface UserData {
  id: number;
  email: string;
  name: string;
  role: 'parent' | 'tutor' | 'admin' | 'student';
  password_hash: string | null;
  session_version: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!(await withinRateLimit(request, 'login', normalizedEmail, 10, 15))) {
      return NextResponse.json(
        { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Find user by email
    const userResult = await pool.query<UserData>(
      'SELECT id, email, name, role, password_hash, session_version FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = user.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      version: user.session_version,
    });

    const response = NextResponse.json(
      {
        message: 'Login successful',
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      { status: 200 }
    );
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
