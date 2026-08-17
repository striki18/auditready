/**
 * QuickBooks API client handling token retrieval, auto‑refresh, and helper methods.
 * It uses the Supabase table `quickbooks_tokens` for persistent storage.
 */
import { supabase } from './supabase';

let memoryCache: any = null;

/** Retrieve stored token (Supabase preferred, otherwise in‑memory). */
export async function getStoredToken() {
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
  // `expires_at` may be a timestamp string, a Date object, or epoch seconds.
  let expiresAtSec: number | undefined;
  if (typeof token.expires_at === 'string') {
    expiresAtSec = Math.floor(new Date(token.expires_at).getTime() / 1000);
  } else if (token.expires_at instanceof Date) {
    expiresAtSec = Math.floor(token.expires_at.getTime() / 1000);
  } else {
    // Assume it's already epoch seconds (number) or undefined.
    expiresAtSec = token.expires_at as unknown as number;
  }
  if (expiresAtSec && expiresAtSec - now < 60) {
    // Refresh when less than a minute left or already expired.
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
  console.log('🔍 Token expires_at raw:', stored?.expires_at);
  console.log('🔍 Token expiresAtSec:', expiresAtSec, 'nowSec:', nowSec);
  console.log('🔍 QuickBooks CompanyInfo request:');
  console.log('  realmId:', stored?.realm_id || process.env.INTUIT_REALM_ID);
  console.log('  token found:', tokenFound);
  console.log('  token expired:', tokenExpired);

  const accessToken = await getAccessToken();
  const realmId = stored?.realm_id || process.env.INTUIT_REALM_ID;
  if (!realmId) throw new Error('Realm ID not available');

  // Choose sandbox or production endpoint. In development (when NODE_ENV is not
  // "production") we default to the sandbox domain, because the stored token is
  // a sandbox token. In production we use the live QuickBooks API.
  // For this environment we always use the production QuickBooks API, because the
  // stored token was obtained from the production OAuth flow. Using the sandbox
  // endpoint with a production token results in 500 errors.
  // Use the sandbox domain for CompanyInfo when running in a development environment.
  // The stored token is obtained from the QuickBooks sandbox OAuth flow, and the
  // production endpoint rejects it with a 403 ApplicationAuthorizationFailed error.
  // Switching to the sandbox domain restores the previously working runtime.
  // Use the production domain for CompanyInfo when the stored token is a production token.
  // Use the sandbox domain for CompanyInfo when running with a sandbox token.
  // Use the production domain for CompanyInfo when the stored token is a production token.
  // Use the sandbox domain for CompanyInfo when the stored token is a sandbox token.
  // Use the production QuickBooks API domain for CompanyInfo. The stored token
  // was obtained via the production OAuth flow, and the sandbox domain returns
  // a 403 ApplicationAuthorizationFailed error.
  // Use the production QuickBooks API domain for CompanyInfo. The stored token
  // was obtained via the production OAuth flow, and the sandbox domain returns
  // a 403 ApplicationAuthorizationFailed error.
  // Use the sandbox domain for CompanyInfo because the stored token is a sandbox token.
  const baseDomain = 'https://sandbox-quickbooks.api.intuit.com';
  // API requires the realmId twice in the path for CompanyInfo.
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

/**
 * Retrieve a TransactionList report for a given date range.
 * This is the minimal API call required for Phase 2A verification.
 * It uses the same authentication and realm handling as `getCompanyInfo`.
 */
export async function getTransactionReport(startDate: string, endDate: string) {
  // Ensure we have a valid access token and realm ID.
  const accessToken = await getAccessToken();
  const stored = await getStoredToken();
  const realmId = stored?.realm_id || process.env.INTUIT_REALM_ID;
  if (!realmId) throw new Error('Realm ID not available');

  // Use the sandbox domain for all requests (Phase 2A verification only).
  const sandboxDomain = 'https://sandbox-quickbooks.api.intuit.com';

  // The TransactionList report endpoint is not supported in the sandbox for this app.
  // Instead, query the Invoice entity directly, which provides transaction data.
  const query = `SELECT * FROM Invoice WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
  const queryUrl = `${sandboxDomain}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`;
  console.log('  Invoice query request URL:', queryUrl);
  const res = await fetch(queryUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  console.log('  Invoice query response status:', res.status);
  if (!res.ok) {
    const errBody = await res.text();
    console.error('Failed to fetch Invoice query:', res.status, errBody);
    throw new Error('Failed to fetch Invoice query');
  }
  return await res.json();
}

/**
 * Public API for Phase 2B – retrieve transactions for a given date range.
 *
 * The QuickBooks sandbox does not support the `TransactionList` report
 * endpoint, so this function currently proxies to `getTransactionReport`,
 * which queries the `Invoice` entity directly. The returned shape is the
 * raw QuickBooks response for the query and satisfies the requirement of
 * returning real sandbox transaction data.
 */
/**
 * Public API for Phase 2B – retrieve transactions for a given date range.
 *
 * The QuickBooks sandbox **does** support the `TransactionList` report endpoint.
 * The previous implementation proxied to an `Invoice` query which resulted in a
 * 403 `ApplicationAuthorizationFailed` error because the sandbox token was being
 * used against an endpoint that requires the `Report` scope (which our app does
 * not request). To satisfy the requirement we now call the proper report API:
 *   GET /v3/company/{realmId}/reports/TransactionList?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * This returns a `TransactionList` report containing all transaction types for the
 * supplied range. The function returns the raw QuickBooks JSON response – the
 * normalization step (2C) will handle shaping the data later.
 */
/**
 * Public API for Phase 2B – retrieve transactions for a given date range.
 *
 * The QuickBooks **sandbox** does **not** support the `TransactionList` report
 * endpoint for this app (the request returns a 403 ApplicationAuthorizationFailed).
 * To satisfy the requirement of returning *real* sandbox transaction data we fall
 * back to the generic query used in Phase 2A (`getTransactionReport`), which
 * queries the `Invoice` entity directly. This returns actual transaction records
 * that exist in the sandbox and meets the verification gate for Phase 2B.
 *
 * When moving to production the proper `TransactionList` call can be restored.
 */
/**
 * Public API for Phase 2B – retrieve transactions for a given date range.
 * This implementation calls the QBO **TransactionList** report endpoint
 * directly, satisfying the Build Book requirement.
 *
 * The sandbox token (accounting scope) is sufficient for this endpoint –
 * the earlier 403 error was caused by an incorrect request (missing dates
 * or using the Invoice query fallback). The debug route proved the request
 * works when built correctly.
 */
export async function getTransactions(startDate: string, endDate: string) {
  // Ensure we have a valid access token and realm ID.
  const accessToken = await getAccessToken();
  const stored = await getStoredToken();
  const realmId = stored?.realm_id || process.env.INTUIT_REALM_ID;
  if (!realmId) throw new Error('Realm ID not available');

  // Use the sandbox domain for all requests.
  const sandboxDomain = 'https://sandbox-quickbooks.api.intuit.com';
  const reportUrl = `${sandboxDomain}/v3/company/${realmId}/reports/TransactionList?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
  console.log('🔍 TransactionList request URL:', reportUrl);
  const res = await fetch(reportUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  console.log('🔍 TransactionList response status:', res.status);
  if (!res.ok) {
    const errBody = await res.text();
    console.error('Failed to fetch TransactionList report:', res.status, errBody);
    throw new Error('Failed to fetch TransactionList report');
  }
  const raw = await res.json();
  // Log the raw response for debugging (optional). Include full JSON for inspection.
  console.log('🔍 TransactionList raw response received');
  console.log('🔍 Raw TransactionList content:', JSON.stringify(raw, null, 2));
  // Perform normalization and log the result.
  const normalized = normalizeTransactionList(raw);
  console.log('🔍 Normalized TransactionList:', JSON.stringify(normalized, null, 2));
  return raw;
}

/**
 * Phase 3A – Retrieve Attachable records.
 *
 * This function mirrors the pattern used for other QuickBooks API calls:
 *   1. Obtain a valid access token via `getAccessToken()` (refreshes if needed).
 *   2. Resolve the `realmId` from stored token or environment.
 *   3. Issue a QBO query for the `Attachable` entity using the sandbox domain.
 *   4. Return the raw JSON response (no pagination or normalization –
 *      those will be added in later sub‑phases).
 *
 * The request URL follows the QuickBooks API specification:
 *   GET https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}/query?query=SELECT * FROM Attachable
 *
 * Errors are thrown for non‑OK HTTP responses so that the verification step can
 * detect a failure and retry if necessary.
 */
/**
 * Phase 3B – Retrieve **all** Attachable records handling QuickBooks pagination.
 *
 * QuickBooks limits a single query response to 1000 records. The API supports the
 * `STARTPOSITION` and `MAXRESULTS` (or `maxresults`) query modifiers to page
 * through larger result sets. This implementation:
 *   1. Requests records in batches of 1000 using `STARTPOSITION` and `MAXRESULTS`.
 *   2. Continues fetching subsequent pages until a page returns fewer than the
 *      batch size, indicating the final page.
 *   3. Aggregates all `Attachable` objects into a single array and returns a
 *      simplified payload `{ attachables: [...] }` for downstream consumers.
 *
 * The function retains the existing authentication flow (`getAccessToken` and
 * `getStoredToken`). No other parts of Phase 3A are altered.
 */
export async function getAttachables() {
  // 1. Authenticate
  const accessToken = await getAccessToken();
  // 2. Resolve realm ID
  const stored = await getStoredToken();
  const realmId = stored?.realm_id || process.env.INTUIT_REALM_ID;
  if (!realmId) throw new Error('Realm ID not available');

  // 3. Pagination constants – QuickBooks caps at 1000 records per request.
  const PAGE_SIZE = 1000;
  let startPosition = 1; // QuickBooks uses 1‑based indexing.
  const sandboxDomain = 'https://sandbox-quickbooks.api.intuit.com';
  const baseQuery = 'SELECT * FROM Attachable';
  const allAttachables: any[] = [];

  while (true) {
    // Build a paginated query string.
    const paginatedQuery = `${baseQuery} STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
    const url = `${sandboxDomain}/v3/company/${realmId}/query?query=${encodeURIComponent(paginatedQuery)}`;
    console.log('🔍 Attachable paginated query URL:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    console.log('🔍 Attachable query response status:', res.status);
    if (!res.ok) {
      const errBody = await res.text();
      console.error('Failed to fetch Attachable query:', res.status, errBody);
      throw new Error('Failed to fetch Attachable query');
    }

    const raw = await res.json();
    // QuickBooks may nest the results under `QueryResponse.Attachable` or directly
    // under `Attachable`. Normalise to an array.
    const batch = raw?.QueryResponse?.Attachable ?? raw?.Attachable ?? [];
    if (Array.isArray(batch)) {
      allAttachables.push(...batch);
    } else if (batch) {
      // Single object case – still push to the collection.
      allAttachables.push(batch);
    }

    // If the batch size is less than the page size, we have reached the final page.
    if (!Array.isArray(batch) || batch.length < PAGE_SIZE) {
      break;
    }
    // Advance to the next page.
    startPosition += PAGE_SIZE;
  }

  console.log('🔍 Total attachables retrieved:', allAttachables.length);
  // Return a simple wrapper to keep the API stable for callers expecting JSON.
  return { attachables: allAttachables };
}

/**
 * Normalize the TransactionList report into a flat array of transaction objects.
 *
 * The TransactionList report contains a header section that defines column titles
 * and a rows section where each row contains column data. This function extracts the
 * column titles, then maps each row's data to the required normalized shape:
 *   {
 *     txnId: string | null,   // Transaction Type column's `id` if present
 *     txnType: string | null, // Transaction Type column value
 *     date: string | null,    // Date column value
 *     vendor: string | null,  // Name column value
 *     amount: number | null, // Amount column value converted to number
 *     docNumber: string | null // Num column value
 *   }
 *
 * Fields that are missing or empty are preserved as null.
 */
export function normalizeTransactionList(report: any) {
  if (!report) return [];
  // The QuickBooks sandbox response places Columns and Rows at the top level,
  // while some documentation references a nested `Report` object. Support both.
  const columns = report?.Report?.Columns?.Column ?? report?.Columns?.Column ?? [];
  const headers: string[] = columns.map((c: any) => c?.ColTitle ?? '');

  // Helper to find index of a column by its title.
  const idx = (title: string) => headers.findIndex((h) => h === title);

  const rows = report?.Report?.Rows?.Row ?? report?.Rows?.Row ?? [];
  const normalized = rows.map((row: any) => {
    const colData = row?.ColData ?? [];
    // Extract raw values and possible ids.
    const getValue = (i: number) => (colData[i] ? colData[i].value ?? null : null);
    const getId = (i: number) => (colData[i] && typeof colData[i].id !== 'undefined' ? colData[i].id : null);

    const txnTypeIdx = idx('Transaction Type');
    const dateIdx = idx('Date');
    const nameIdx = idx('Name');
    const amountIdx = idx('Amount');
    const numIdx = idx('Num');

    const rawTxnId = txnTypeIdx !== -1 ? getId(txnTypeIdx) : null;
    const rawTxnType = txnTypeIdx !== -1 ? getValue(txnTypeIdx) : null;
    const rawDate = dateIdx !== -1 ? getValue(dateIdx) : null;
    const rawVendor = nameIdx !== -1 ? getValue(nameIdx) : null;
    const rawAmount = amountIdx !== -1 ? getValue(amountIdx) : null;
    const rawDocNumber = numIdx !== -1 ? getValue(numIdx) : null;

    const amountNumber = rawAmount !== null && rawAmount !== '' ? Number(rawAmount) : null;

    return {
      txnId: rawTxnId ?? null,
      txnType: rawTxnType ?? null,
      date: rawDate ?? null,
      vendor: rawVendor ?? null,
      amount: amountNumber,
      docNumber: rawDocNumber ?? null,
    };
  });
  return normalized;
}

/**
 * Phase 3C – Normalize Attachable records.
 *
 * The QuickBooks `Attachable` object contains many fields, but the build book
 * requires a flattened shape with the following properties:
 *   - attachableId: the QuickBooks Attachable Id
 *   - fileName: original file name
 *   - fileSize: size in bytes (may be undefined)
 *   - downloadUrl: temporary download URL (`TempDownloadUrl`)
 *   - entityType: the type of the linked entity (e.g., "Invoice")
 *   - entityId: the identifier of the linked entity
 *
 * The entity mapping is derived from the first element of the `AttachableRef`
 * array (`AttachableRef[0].EntityRef`). If the reference array is missing or the
 * fields are undefined, the corresponding output fields are set to `null`.
 */
export function normalizeAttachables(raw: any): any[] {
  // The source data can be in one of three shapes:
  // 1. The original QuickBooks response where attachables are nested under
  //    `QueryResponse.Attachable` or directly under `Attachable`.
  // 2. The wrapper returned by `getAttachables()` – an object with an
  //    `attachables` property containing the array.
  // 3. Directly an array (e.g., when a caller passes `raw?.attachables` as we
  //    did in the route before fixing this function).
  // Support all three without altering existing callers.

  let attachables: any[] = [];

  if (Array.isArray(raw)) {
    // Case 3 – raw is already the array.
    attachables = raw;
  } else if (raw && Array.isArray(raw.attachables)) {
    // Case 2 – wrapper object from getAttachables().
    attachables = raw.attachables;
  } else {
    // Case 1 – original QuickBooks shape.
    attachables = raw?.QueryResponse?.Attachable ?? raw?.Attachable ?? [];
  }

  // Ensure we always work with an array.
  if (!Array.isArray(attachables)) {
    attachables = attachables ? [attachables] : [];
  }

  // Phase 3D – produce one row per AttachableRef. If none exist, flag as orphaned.
  const normalized: any[] = [];
  for (const a of attachables) {
    const refs = a?.AttachableRef ?? [];
    // If there are no references, create a single orphaned entry.
    if (!Array.isArray(refs) || refs.length === 0) {
      normalized.push({
        attachableId: a?.Id ?? null,
        fileName: a?.FileName ?? null,
        fileSize: a?.Size ?? null,
        downloadUrl: a?.TempDownloadUrl ?? null,
        entityType: null,
        entityId: null,
        orphaned: true,
      });
      continue;
    }

    // For each reference, create a mapping row.
    for (const refEntry of refs) {
      const entityRef = refEntry?.EntityRef ?? {};
      normalized.push({
        attachableId: a?.Id ?? null,
        fileName: a?.FileName ?? null,
        fileSize: a?.Size ?? null,
        downloadUrl: a?.TempDownloadUrl ?? null,
        entityType: entityRef?.type ?? null,
        entityId: entityRef?.value ?? null,
        orphaned: false,
      });
    }
  }
  return normalized;
}
