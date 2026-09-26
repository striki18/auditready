import { NextResponse } from 'next/server';
import { getRegisterEntries, persistRegisterEntries } from '@/lib/qbo-evidence-register';

/**
 * GET /api/evidence/qbo-register?realmId=...&collectionRequestId=...&startDate=...&endDate=...
 * 
 * Returns the QBO evidence register with 4 final states:
 * - MATCHED: Correct attachment for this transaction
 * - WRONG_MATCHED: Attachment confidently matches a different QBO transaction
 * - MISSING: No supporting document exists for a transaction
 * - REVIEW_REQUIRED: Requires manual review
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const realmId = searchParams.get('realmId');
    const collectionRequestId = searchParams.get('collectionRequestId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!realmId) {
      return NextResponse.json({ error: 'realmId is required' }, { status: 400 });
    }

    const register = await getRegisterEntries(realmId, collectionRequestId);

    return NextResponse.json(register);
  } catch (e: any) {
    console.error('QBO evidence register error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/evidence/qbo-register
 * 
 * Builds and persists the QBO evidence register to the database.
 * Body: { realmId?, collectionRequestId?, startDate?, endDate? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const realmId = body.realmId;
    const collectionRequestId = body.collectionRequestId;
    const startDate = body.startDate;
    const endDate = body.endDate;

    if (!realmId) {
      return NextResponse.json({ error: 'realmId is required' }, { status: 400 });
    }

    const register = await getRegisterEntries(realmId, collectionRequestId);

    // Persist to database
    await persistRegisterEntries(register, realmId);

    return NextResponse.json({ 
      success: true, 
      count: register.length,
      summary: summarizeRegister(register)
    });
  } catch (e: any) {
    console.error('QBO evidence register persist error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function summarizeRegister(entries: any[]) {
  const summary: Record<string, number> = {
    MATCHED: 0,
    WRONG_MATCHED: 0,
    MISSING: 0,
    REVIEW_REQUIRED: 0,
  };
  
  for (const entry of entries) {
    if (entry.registerState && summary[entry.registerState] !== undefined) {
      summary[entry.registerState]++;
    }
  }
  
  return summary;
}
