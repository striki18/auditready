import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/evidence/request?engagement_id=<uuid>
 *
 * Returns all evidence_requests rows for the given engagement.
 * - Missing engagement_id → 400
 * - Invalid UUID format → 400
 * - No rows → [] with 200
 * - Otherwise returns array of rows ordered by created_at ASC.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const engagementId = searchParams.get('engagement_id');

    // Validate presence
    if (!engagementId) {
      return NextResponse.json({ error: 'engagement_id is required' }, { status: 400 });
    }

    // Simple UUID v4 regex (allows uppercase/lowercase)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(engagementId)) {
      return NextResponse.json({ error: 'Invalid engagement_id' }, { status: 400 });
    }

  // Optional status filtering
  const status = searchParams.get('status');
  // Validate status if provided
  if (status && !['requested', 'received', 'all'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Build base query
  let query = supabase
    .from('evidence_requests')
    .select('*')
    .eq('engagement_id', engagementId);

  // Apply status filter unless omitted or set to 'all'
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch evidence requests:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // data may be null if no rows
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    console.error('Unexpected error in evidence request GET:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/evidence/request
 *
 * Creates a new evidence request.
 * Expected JSON body:
 * {
 *   "engagement_id": "uuid",
 *   "plan_id": "uuid"
 * }
 *
 * Validation steps:
 *   - Valid JSON
 *   - Both fields present
 *   - Both are valid UUIDs
 *   - Engagement exists in `audit_engagements`
 *   - Evidence plan exists in `audit_evidence_plan`
 *   - No existing evidence_requests row with same engagement_id & plan_id
 *
 * On success inserts a row with:
 *   status: "requested",
 *   requested_at: now,
 *   received_at: null
 * and returns the inserted row.
 */
export async function POST(request: Request) {
  // 1. Parse JSON body
  let payload: any;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { engagement_id, plan_id } = payload ?? {};

  // 2. Validate required fields
  if (!engagement_id) {
    return NextResponse.json({ error: 'engagement_id is required' }, { status: 400 });
  }
  if (!plan_id) {
    return NextResponse.json({ error: 'plan_id is required' }, { status: 400 });
  }

  // 3. Validate UUID format (allow any version)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(engagement_id)) {
    return NextResponse.json({ error: 'Invalid engagement_id' }, { status: 400 });
  }
  if (!uuidRegex.test(plan_id)) {
    return NextResponse.json({ error: 'Invalid plan_id' }, { status: 400 });
  }

  try {
    // 4. Verify engagement exists
    const { data: engagementData, error: engagementError } = await supabase
      .from('audit_engagements')
      .select('id')
      .eq('id', engagement_id)
      .single();
    if (engagementError || !engagementData) {
      return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
    }

    // 5. Verify evidence plan exists
    const { data: planData, error: planError } = await supabase
      .from('audit_evidence_plan')
      .select('id')
      .eq('id', plan_id)
      .single();
    if (planError || !planData) {
      return NextResponse.json({ error: 'Evidence plan not found' }, { status: 404 });
    }

    // 6. Duplicate prevention
    const { data: dupData, error: dupError } = await supabase
      .from('evidence_requests')
      .select('id')
      .eq('engagement_id', engagement_id)
      .eq('plan_id', plan_id)
      .maybeSingle();
    if (dupError) {
      // Unexpected DB error while checking duplicates
      console.error('Duplicate check error:', dupError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (dupData) {
      return NextResponse.json({ error: 'Evidence request already exists' }, { status: 409 });
    }

    // 7. Insert new evidence request
    const now = new Date().toISOString();
    const { data: insertData, error: insertError } = await supabase
      .from('evidence_requests')
      .insert({
        engagement_id,
        plan_id,
        status: 'requested',
        requested_at: now,
        received_at: null,
      })
      .select();

    if (insertError) {
      console.error('Insert evidence request error:', insertError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // supabase returns an array; return the first element
    const result = Array.isArray(insertData) ? insertData[0] : insertData;
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Unexpected error in evidence request POST:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
