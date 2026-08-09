import { NextResponse } from 'next/server';
import { getTransactionReport } from '@/lib/quickbooks';

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

    const data = await getTransactionReport(startDate, endDate);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('TransactionReport error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
