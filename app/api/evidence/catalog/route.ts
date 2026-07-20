import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/evidence/catalog – returns the master Evidence Catalog.
 * Returns every field, ordered by display_order ascending.
 * If the table is empty, returns an empty array.
 * On unexpected database errors, returns HTTP 500 with an error message.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('audit_evidence_catalog')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to load evidence catalog:', error);
      return NextResponse.json(
        { error: 'Failed to load evidence catalog' },
        { status: 500 }
      );
    }

    // data will be null if no rows; return empty array in that case.
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    console.error('Unexpected error loading evidence catalog:', e);
    return NextResponse.json(
      { error: 'Failed to load evidence catalog' },
      { status: 500 }
    );
  }
}
