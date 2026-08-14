import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

/**
 * Generate a random string for PKCE code verifier and OAuth state.
 */
function generateRandomString(length: number): string {
  return randomBytes(length).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export async function GET() {
  // Environment variables (server side only)
  const clientId = process.env.INTUIT_CLIENT_ID!;
  const redirectUri = process.env.INTUIT_REDIRECT_URI!;
  // The OAuth scope must include the Attachments permission.
  // Ensure the exact, supported scope string is used.
  // If you also need accounting data, combine both scopes with a space.
  const scope = 'com.intuit.quickbooks.accounting';

  // Generate PKCE verifier & challenge and state
  const codeVerifier = generateRandomString(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // Store verifier and state in httpOnly cookies (short lived)
  const response = NextResponse.redirect(
    `https://appcenter.intuit.com/connect/oauth2?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      scope
    )}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(
      codeChallenge
    )}&code_challenge_method=S256`
  );

  // Set cookies (secure, httpOnly, sameSite strict, short ttl)
  const maxAge = 10 * 60; // 10 minutes
  // In development (http) the `secure` flag prevents the cookie from being sent.
  // Set it to false to ensure cookies are transmitted over http://localhost.
  // Use SameSite='lax' to allow the cookie to be sent on the cross‑site redirect
  // from Intuit back to our localhost callback. Secure is false for local http.
  response.cookies.set('intuit_oauth_state', state, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
  response.cookies.set('intuit_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  return response;
}
