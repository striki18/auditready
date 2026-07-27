import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/evidence/request/[id]
 *
 * Returns a single evidence_requests row identified by the UUID `id`.
 *
 * - If `id` is missing → 400
 * - If `id` is not a valid UUID → 400
 * - If no record exists for the given `id` → 404
 * - On success → 200 with the exact database row
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // `params` is a Promise in the App Router; await it to get the actual values.
    const { id } = await params;

    // Validate presence (Next.js will always provide the param, but guard anyway)
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Simple UUID regex (allows any version/variant, uppercase/lowercase)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('evidence_requests')
      .select('*')
      .eq('id', id);

    if (error) {
      console.error('Failed to fetch evidence request by id:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // `data` will be an array; if empty, the record does not exist.
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Evidence request not found' }, { status: 404 });
    }

    // Return the first (and only) row.
    return NextResponse.json(data[0]);
  } catch (e: any) {
    console.error('Unexpected error in evidence request GET by id:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
