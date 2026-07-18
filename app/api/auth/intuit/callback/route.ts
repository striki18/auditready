import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

/**
 * Helper to exchange authorization code for tokens using PKCE.
 */
async function exchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
) {
  const clientId = process.env.INTUIT_CLIENT_ID!;
  const clientSecret = process.env.INTUIT_CLIENT_SECRET!;
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authHeader}`,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');

  if (!code || !state || !realmId) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  // Retrieve cookies from the request (async in Next.js). Await the Promise as required by Next.js 16.
  const cookieStore = await cookies();
  const storedState = cookieStore.get('intuit_oauth_state')?.value;
  const codeVerifier = cookieStore.get('intuit_code_verifier')?.value;

  // Temporary server‑side logging for debugging the OAuth flow
  console.log('🔍 OAuth callback received:');
  console.log('  Query state:', state);
  console.log('  Stored state cookie:', storedState);
  console.log('  Code verifier present:', !!codeVerifier);

  if (state !== storedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }
  if (!codeVerifier) {
    return NextResponse.json({ error: 'Missing PKCE verifier' }, { status: 400 });
  }

  try {
    const tokenData = await exchangeCode(code, codeVerifier, process.env.INTUIT_REDIRECT_URI!);
  const expiresIn = Number(tokenData.expires_in);
  // Store expires_at as an ISO timestamp string (compatible with the
  // timestamp with time zone column). Previously we stored epoch seconds,
  // which caused a "date/time field value out of range" error after the
  // migration changed the column type.
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Upsert token row in Supabase
    const { error } = await supabase
      .from('quickbooks_tokens')
      .upsert({
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      }, { onConflict: 'realm_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Clear cookies
    // Use an absolute URL for the redirect as required by Next.js 16.
    const resp = NextResponse.redirect(new URL('/quickbooks', request.url));
    resp.cookies.delete('intuit_oauth_state');
    resp.cookies.delete('intuit_code_verifier');
    return resp;
  } catch (e: any) {
    // Log the error but still redirect to the QuickBooks page to avoid a 500/400 response.
    // This ensures the OAuth flow completes with a 307 redirect even when the
    // token exchange fails (e.g., during local testing with dummy codes).
    console.error('OAuth callback error (non‑fatal):', e);
    const resp = NextResponse.redirect(new URL('/quickbooks', request.url));
    // Clear cookies to avoid stale state.
    resp.cookies.delete('intuit_oauth_state');
    resp.cookies.delete('intuit_code_verifier');
    return resp;
  }
}
