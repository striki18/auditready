import { NextResponse } from 'next/server';
import { getStoredToken } from '@/lib/quickbooks';

/** GET /api/auth/intuit/token – returns the stored token info (realmId, expires_at, etc.) */
export async function GET() {
  try {
    const token = await getStoredToken();
    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 404 });
    }
    return NextResponse.json({
      realmId: token.realm_id,
      expires_at: token.expires_at,
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}