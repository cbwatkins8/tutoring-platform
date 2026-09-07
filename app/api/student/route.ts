import { NextRequest, NextResponse } from 'next/server';
import { studentsFor, studentFor, verifiedSessionFromRequest } from '@/lib/access';

/**
 * GET /api/student            -> first student (back-compat) + full list
 * GET /api/student?id=123     -> that specific student, if the caller owns it
 *
 * `student` is kept in the response so existing pages keep working unchanged;
 * `students` is the full list for anything that wants to show all children.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifiedSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const idParam = request.nextUrl.searchParams.get('id');

    if (idParam) {
      const one = await studentFor(session, Number(idParam));
      if (!one) {
        // Same 404 whether the id is unknown or simply not theirs, so this
        // cannot be used to discover which student ids exist.
        return NextResponse.json({ message: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json({ student: one, students: [one] }, { status: 200 });
    }

    const all = await studentsFor(session);

    if (all.length === 0) {
      return NextResponse.json(
        { message: 'No student found', students: [] },
        { status: 404 }
      );
    }

    return NextResponse.json({ student: all[0], students: all }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ message: 'An error occurred' }, { status: 500 });
  }
}
