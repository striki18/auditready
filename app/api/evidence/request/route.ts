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

    const { data, error } = await supabase
      .from('evidence_requests')
      .select('*')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true });

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
