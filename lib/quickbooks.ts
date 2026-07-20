/**
 * QuickBooks API client handling token retrieval, auto‑refresh, and helper methods.
 * It uses the Supabase table `quickbooks_tokens` for persistent storage.
 */
import { supabase } from '@/lib/supabase';

let memoryCache: any = null;

/** Retrieve stored token (Supabase preferred, otherwise in‑memory). */
async function getStoredToken() {
  // If Supabase client is configured, query the table.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { data, error } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .order('expires_at', { ascending: true })
      .limit(1)
      .single();
    if (!error && data) return data;
  }
  // Fallback to in‑memory cache (useful for local dev without Supabase).
  return memoryCache;
}

/** Store token (used for both initial exchange and refresh). */
async function storeToken(tokenData: any, realmId?: string) {
  // Determine the realm identifier to store.
  let finalRealmId = realmId ?? tokenData.realmId;
  if (!finalRealmId) {
    const existing = await getStoredToken();
    finalRealmId = existing?.realm_id || '';
  }

  // Convert expires_at to a proper timestamp for the DB column.
  // QuickBooks may return `expires_at` as epoch seconds (number). Convert it
  // to an ISO‑8601 string so it matches the `timestamptz` column type.
  const expiresAt = tokenData.expires_at
    ? typeof tokenData.expires_at === 'number'
      ? new Date(tokenData.expires_at * 1000).toISOString()
      : tokenData.expires_at
    : new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString();

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Use upsert with conflict on realm_id to avoid duplicate rows.
    const { error } = await supabase.from('quickbooks_tokens').upsert([
      {
        realm_id: finalRealmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      },
    ], { onConflict: 'realm_id' });
    if (error) throw error;
    return;
  }
  // In‑memory fallback.
  memoryCache = { ...tokenData, realm_id: finalRealmId, expires_at: expiresAt };
}

/** Refresh the access token using the stored refresh token. */
async function refreshAccessToken(refreshToken: string) {
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  const basicAuth = Buffer.from(
    `${process.env.INTUIT_CLIENT_ID}:${process.env.INTUIT_CLIENT_SECRET}`
  ).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Failed to refresh QuickBooks token');
  const data = await res.json();
  await storeToken(data);
  return data.access_token;
}

/** Get a valid access token, refreshing if needed. */
export async function getAccessToken() {
  const token = await getStoredToken();
  if (!token) throw new Error('No QuickBooks token found');
  const now = Math.floor(Date.now() / 1000);
  // `expires_at` may be a timestamp string; convert to epoch seconds.
  const expiresAtSec = typeof token.expires_at === 'string'
    ? Math.floor(new Date(token.expires_at).getTime() / 1000)
    : token.expires_at;
  if (expiresAtSec && expiresAtSec - now < 60) {
    // Refresh when less than a minute left.
    return await refreshAccessToken(token.refresh_token);
  }
  return token.access_token;
}

/** Helper to fetch CompanyInfo from QuickBooks. */
export async function getCompanyInfo() {
  // Temporary server‑side logging (no secrets)
  const stored = await getStoredToken();
  const tokenFound = !!stored;
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAtSec = typeof stored?.expires_at === 'string'
    ? Math.floor(new Date(stored.expires_at).getTime() / 1000)
    : stored?.expires_at;
  const tokenExpired = tokenFound && expiresAtSec ? expiresAtSec <= nowSec : false;
  console.log('🔍 QuickBooks CompanyInfo request:');
  console.log('  realmId:', stored?.realm_id || process.env.INTUIT_REALM_ID);
  console.log('  token found:', tokenFound);
  console.log('  token expired:', tokenExpired);

  const accessToken = await getAccessToken();
  const realmId = stored?.realm_id || process.env.INTUIT_REALM_ID;
  if (!realmId) throw new Error('Realm ID not available');

  // Choose sandbox or production endpoint based on env var INTUIT_SANDBOX (optional)
  // Use the sandbox endpoint during development (when NODE_ENV is not 'production')
  // or when the explicit INTUIT_SANDBOX flag is set. This avoids the 403
  // ApplicationAuthorizationFailed error that occurs when a sandbox token is
  // sent to the production API.
  const baseDomain = (process.env.INTUIT_SANDBOX === 'true' || process.env.NODE_ENV !== 'production')
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
  // API requires the realmId twice in the path
  const url = `${baseDomain}/v3/company/${realmId}/companyinfo/${realmId}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  console.log('  QuickBooks response status:', res.status);
  if (!res.ok) {
    const errBody = await res.text();
    console.error('Failed to fetch CompanyInfo:', res.status, errBody);
    throw new Error('Failed to fetch CompanyInfo');
  }
  return await res.json();
}
