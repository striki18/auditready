import { NextResponse } from 'next/server';
import { getTransactions, normalizeTransactionList } from '@/lib/quickbooks';
import { getAttachables, normalizeAttachables } from '@/lib/quickbooks';
import { buildEvidenceRegister } from '@/lib/evidence';
import { generateAndSaveCsvs } from '@/lib/output';

/**
 * GET /api/evidence/csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Generates evidence_register.csv and missing_documents.csv from the evidence register.
 * Saves them to the company output directory.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const companyName = searchParams.get('companyName') || 'sandbox_company';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // 1. Fetch raw data
    const rawTxns = await getTransactions(startDate, endDate);
    const rawAttach = await getAttachables();

    // 2. Normalize
    const txns = normalizeTransactionList(rawTxns);
    const attach = normalizeAttachables(rawAttach);

    // 3. Build register
    const register = buildEvidenceRegister(txns, attach);

    // 4. Generate and save CSVs
    const result = await generateAndSaveCsvs(register, companyName, startDate, endDate);

    return NextResponse.json({
      success: true,
      evidenceRegisterPath: result.evidenceRegisterPath,
      missingDocumentsPath: result.missingDocumentsPath,
      matchedCount: result.matchedCount,
      missingCount: result.missingCount,
    });
  } catch (e: any) {
    console.error('CSV generation error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}