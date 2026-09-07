import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentName, parentEmail, parentPassword, studentName, studentGrade, studentSubjects } = body;

    // Validate required fields
    if (!parentName || !parentEmail || !parentPassword || !studentName || !studentGrade) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [parentEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(parentPassword, saltRounds);

    // Insert parent user
    const userResult = await pool.query(
      'INSERT INTO users (email, name, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [parentEmail, parentName, hashedPassword, 'parent']
    );

    const userId = userResult.rows[0].id;

    // Insert student
    const studentResult = await pool.query(
      'INSERT INTO students (first_name, last_name, grade_level, academic_notes, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [studentName, 'Student', parseInt(studentGrade), studentSubjects.join(', ')]
    );

    const studentId = studentResult.rows[0].id;

    // Link student to parent
    await pool.query(
      'INSERT INTO student_guardians (student_id, user_id, relationship, primary_contact) VALUES ($1, $2, $3, $4)',
      [studentId, userId, 'parent', true]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        userId,
        studentId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
