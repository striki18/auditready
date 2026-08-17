import { NextResponse } from 'next/server';
import { getAttachables, normalizeAttachables } from '@/lib/quickbooks';

/**
 * GET /api/quickbooks/attachables – returns the raw Attachable records from QuickBooks.
 * This endpoint is used by the front‑end to fetch supporting documents (e.g., receipts).
 */
export async function GET(request: Request) {
  try {
    // No query parameters needed – simply retrieve all attachables for the stored realm.
  const raw = await getAttachables();
  console.log('🔍 Attachables raw response length:', raw?.attachables?.length);
  // Normalize the attachable records as required by Phase 3C.
  const normalized = normalizeAttachables(raw?.attachables ?? []);
  console.log('🔍 Normalized attachables count:', normalized?.length);
  console.log('🔍 First normalized item:', JSON.stringify(normalized?.[0] || {}));
  // Return the normalized attachable records.
  return NextResponse.json(normalized);
  } catch (e: any) {
    console.error('Attachables endpoint error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
};
