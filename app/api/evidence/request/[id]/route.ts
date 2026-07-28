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

/**
 * PATCH /api/evidence/request/[id]
 *
 * Updates the status of an evidence request to "received".
 * Expected JSON body:
 * {
 *   "status": "received"
 * }
 *
 * Validation:
 *   - Valid JSON body
 *   - "status" field present and exactly "received"
 *   - "id" route param present and valid UUID
 *   - Evidence request exists
 *   - Current status is not already "received"
 *
 * Business rules:
 *   - Update only status, received_at, updated_at fields.
 *   - Preserve other columns.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Parse and validate request body
  let payload: any;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { status } = payload ?? {};
  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }
  if (status !== 'received') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Resolve route params
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Fetch existing record
  const { data: existing, error: fetchError } = await supabase
    .from('evidence_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) {
    // If no rows, supabase returns error with code "PGRST116" (or similar). Treat as not found.
    if ((fetchError as any).code === 'PGRST116' || (fetchError as any).details?.includes('Row not found')) {
      return NextResponse.json({ error: 'Evidence request not found' }, { status: 404 });
    }
    console.error('Failed to fetch evidence request for PATCH:', fetchError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Business rule: already received?
  if (existing && existing.status === 'received') {
    return NextResponse.json({ error: 'Evidence request already received' }, { status: 409 });
  }

  // Perform update
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('evidence_requests')
    .update({
      status: 'received',
      received_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select();

  if (updateError) {
    console.error('Failed to update evidence request:', updateError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // supabase returns an array; return first element
  const result = Array.isArray(updated) ? updated[0] : updated;
  return NextResponse.json(result);
}
