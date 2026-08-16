import { NextResponse } from 'next/server';
import { getAttachables } from '@/lib/quickbooks';

/**
 * GET /api/quickbooks/attachables – returns the raw Attachable records from QuickBooks.
 * This endpoint is used by the front‑end to fetch supporting documents (e.g., receipts).
 */
export async function GET(request: Request) {
  try {
    // No query parameters needed – simply retrieve all attachables for the stored realm.
    const raw = await getAttachables();
    // Return the raw JSON payload. Consumers can normalize as needed.
    return NextResponse.json(raw);
  } catch (e: any) {
    console.error('Attachables endpoint error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
};
