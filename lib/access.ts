// Who is allowed to see which student.
//
// Two kinds of caller reach the student endpoints:
//   - a parent, who may have several children linked via student_guardians
//   - a student, who may see exactly their own record
//
// Centralising this means a new endpoint cannot accidentally skip the check.

import { getSessionFromRequest, type SessionPayload } from './session';
export { pool } from './db';
import { pool } from './db';

/** Verify a signed token against the account's current revocation version. */
export async function verifiedSessionFromRequest(
  request: Request
): Promise<SessionPayload | null> {
  const session = getSessionFromRequest(request);
  if (!session) return null;

  const { rows } = await pool.query<{
    email: string;
    role: SessionPayload['role'];
    session_version: number;
  }>(
    `SELECT email, role, session_version
       FROM users
      WHERE id = $1`,
    [session.userId]
  );
  const account = rows[0];

  if (
    !account ||
    account.email !== session.email ||
    account.role !== session.role ||
    account.session_version !== session.version
  ) return null;

  return session;
}

export interface StudentRow {
  id: number;
  first_name: string;
  last_name: string;
  grade_level: number | null;
  school_name: string | null;
  academic_notes: string | null;
  subjects: string | null;
  user_id: number | null;
  has_login: boolean;
}

/** Every student this session may read, oldest first. Empty if none. */
export async function studentsFor(session: SessionPayload): Promise<StudentRow[]> {
  if (session.role === 'student') {
    const { rows } = await pool.query(
      `SELECT s.*, (s.user_id IS NOT NULL) AS has_login
         FROM students s
        WHERE s.user_id = $1`,
      [session.userId]
    );
    return rows;
  }

  if (session.role === 'parent') {
    const { rows } = await pool.query(
      `SELECT s.*, (s.user_id IS NOT NULL) AS has_login
         FROM students s
         JOIN student_guardians sg ON s.id = sg.student_id
        WHERE sg.user_id = $1
        ORDER BY s.id`,
      [session.userId]
    );
    return rows;
  }

  // Tutors and admins do not read students through this path; they go through
  // the session list, which is already scoped to their own bookings.
  return [];
}

/**
 * Resolve one student for this session.
 * Pass a studentId to select a specific child; omit it to get the first.
 * Returns null when the id is unknown OR not theirs -- callers must not
 * distinguish the two, or the response becomes an id-enumeration oracle.
 */
export async function studentFor(
  session: SessionPayload,
  studentId?: number | null
): Promise<StudentRow | null> {
  const all = await studentsFor(session);
  if (all.length === 0) return null;

  if (studentId === undefined || studentId === null) return all[0];

  return all.find((s) => s.id === Number(studentId)) ?? null;
}

/** True if this session may write to the given student record. */
export async function canEditStudent(
  session: SessionPayload,
  studentId: number
): Promise<boolean> {
  // Students may read their own record but not rewrite their academic notes.
  if (session.role !== 'parent') return false;
  return (await studentFor(session, studentId)) !== null;
}
