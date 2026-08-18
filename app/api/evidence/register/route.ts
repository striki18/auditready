import { NextResponse } from 'next/server';
import { getTransactions, normalizeTransactionList } from '@/lib/quickbooks';
import { getAttachables, normalizeAttachables } from '@/lib/quickbooks';
import { buildEvidenceRegister } from '@/lib/evidence';

/**
 * GET /api/evidence/register?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns the evidence register – a joined view of transactions and their
 * related attachable documents. The endpoint is the minimal implementation for
 * Phase 4A.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // 1. Fetch raw data
    const rawTxns = await getTransactions(startDate, endDate);
    const rawAttach = await getAttachables();

    // 2. Normalize
    const txns = normalizeTransactionList(rawTxns);
    const attach = normalizeAttachables(rawAttach);

    // 3. Build register
    const register = buildEvidenceRegister(txns, attach);

    return NextResponse.json(register);
  } catch (e: any) {
    console.error('Evidence register error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
