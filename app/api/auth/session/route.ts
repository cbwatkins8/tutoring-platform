import { NextRequest, NextResponse } from 'next/server';
import { verifiedSessionFromRequest } from '@/lib/access';

export async function GET(request: NextRequest) {
  const session = await verifiedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: { userId: session.userId, email: session.email, role: session.role },
  });
}
