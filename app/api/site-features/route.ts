import { NextResponse } from 'next/server';
import { getSiteFeatures } from '@/lib/site-features';

export async function GET() {
  try {
    return NextResponse.json(
      { features: await getSiteFeatures() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading site features:', error);
    return NextResponse.json({ features: { client_portal: false, online_booking: false } });
  }
}
