import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/** GET /api/evidence/history?realm_id=<realm>&catalog_id=<uuid>
 * Returns historical evidence provider records for the given realm and catalog item.
 * Required query parameters: realm_id (text), catalog_id (uuid).
 * Returns 400 if any required parameter is missing.
 * Returns [] with 200 if no matching rows.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const realmId = searchParams.get('realm_id');
    const catalogId = searchParams.get('catalog_id');

    if (!realmId) {
      return NextResponse.json({ error: 'realm_id is required' }, { status: 400 });
    }
    if (!catalogId) {
      return NextResponse.json({ error: 'catalog_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('evidence_history')
      .select(
        'provider_name, job_title, department, provider_email, fiscal_year, days_to_receive, notes'
      )
      .eq('realm_id', realmId)
      .eq('catalog_id', catalogId)
      .order('fiscal_year', { ascending: false });

    if (error) {
      console.error('Failed to fetch evidence history:', error);
      return NextResponse.json({ error: 'Failed to load evidence history' }, { status: 500 });
    }

    // data will be an array (empty if no rows)
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    console.error('Unexpected error in evidence history API:', e);
    return NextResponse.json({ error: 'Failed to load evidence history' }, { status: 500 });
  }
}
