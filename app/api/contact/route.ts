import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/access';
import { withinRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/contact  -- public, no authentication.
 *
 * A consultation request from the marketing site. Deliberately reachable
 * without an account: asking a stranger to sign up before they can ask a
 * question is how you lose the enquiry.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parent_name,
      email,
      phone,
      student_name,
      grade_level,
      subject,
      message,
      referral_source,
      website, // honeypot
    } = body;

    // Bots fill in every field they find. This one is hidden from people, so
    // anything in it is automated -- accept it silently so the bot does not
    // learn to try again, but write nothing.
    if (website) {
      return NextResponse.json({ message: 'Thanks — I will be in touch.' }, { status: 201 });
    }

    if (!parent_name?.trim()) {
      return NextResponse.json({ message: 'Please enter your name' }, { status: 400 });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { message: 'Please tell me a little about what is going on' },
        { status: 400 }
      );
    }

    if (!(await withinRateLimit(request, 'contact', cleanEmail, 3, 60))) {
      return NextResponse.json(
        { message: 'I already have your request — I will be in touch shortly.' },
        { status: 429 }
      );
    }

    const grade =
      grade_level === undefined || grade_level === null || grade_level === ''
        ? null
        : parseInt(String(grade_level), 10);

    const { rows } = await pool.query(
      `INSERT INTO inquiries (
         parent_name, email, phone, student_name,
         grade_level, subject, message, referral_source, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [
        String(parent_name).trim().slice(0, 255),
        cleanEmail,
        phone ? String(phone).trim().slice(0, 50) : null,
        student_name ? String(student_name).trim().slice(0, 255) : null,
        Number.isInteger(grade) ? grade : null,
        subject ? String(subject).trim().slice(0, 255) : null,
        String(message).trim().slice(0, 5000),
        referral_source ? String(referral_source).trim().slice(0, 255) : null,
      ]
    );

    return NextResponse.json(
      { message: 'Thanks — I will be in touch.', id: rows[0].id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON request' }, { status: 400 });
    }
    console.error('Contact form error:', error);
    return NextResponse.json(
      { message: 'Something went wrong. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
