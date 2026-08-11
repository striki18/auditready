import { NextResponse } from 'next/server';
import { getTransactions } from '@/lib/quickbooks';

/**
 * GET /api/quickbooks/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns the TransactionList report from QuickBooks for the given range.
 * This endpoint is added solely for Phase 2A verification and can be removed later.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') ?? '2023-01-01';
    const endDate = url.searchParams.get('endDate') ?? '2023-01-31';

  // `getTransactions` fetches the raw TransactionList report, normalizes it,
  // and logs the normalized result. It returns the raw report, so we invoke
  // the normalization function here to return the clean flat array as required
  // by Phase 2C.
  const rawReport = await getTransactions(startDate, endDate);
  // Import the normalization helper directly to avoid an extra round‑trip.
  // The function is exported from `lib/quickbooks.ts`.
  const { normalizeTransactionList } = await import("@/lib/quickbooks");
  const normalized = normalizeTransactionList(rawReport);
  // The normalization function already logs the result, but we also log here
  // for explicit visibility of the API response.
  console.log("🔍 API response – normalized TransactionList:", JSON.stringify(normalized, null, 2));
  return NextResponse.json(normalized);
  } catch (e: any) {
    console.error('TransactionReport error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
