import { NextRequest, NextResponse } from 'next/server';
import { pool, verifiedSessionFromRequest } from '@/lib/access';
import { getSiteFeatures, type SiteFeatures } from '@/lib/site-features';

async function requireStaff(request: NextRequest) {
  const session = await verifiedSessionFromRequest(request);
  return session && (session.role === 'tutor' || session.role === 'admin') ? session : null;
}

export async function GET(request: NextRequest) {
  if (!(await requireStaff(request))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ features: await getSiteFeatures() });
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireStaff(request))) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const allowed: Array<keyof SiteFeatures> = ['client_portal', 'online_booking'];
    const updates = allowed.filter((key) => typeof body[key] === 'boolean');
    if (updates.length === 0) {
      return NextResponse.json({ message: 'No valid feature settings supplied' }, { status: 400 });
    }
    for (const key of updates) {
      await pool.query(
        `INSERT INTO site_features (key, enabled, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
        [key, body[key]]
      );
    }
    return NextResponse.json({ message: 'Site settings saved', features: await getSiteFeatures() });
  } catch (error) {
    console.error('Error saving site features:', error);
    return NextResponse.json({ message: 'Could not save site settings' }, { status: 500 });
  }
}
