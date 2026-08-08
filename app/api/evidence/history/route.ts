import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/evidence/history
 *
 * Returns a list of all evidence packages.
 * Each package includes only its metadata:
 *   - id
 *   - engagement_id
 *   - status
 *   - created_at
 *   - zip_path (if present)
 *
 * The list is ordered by `created_at` descending (newest first).
 * No ZIP generation, file uploads, or database modifications are performed.
 */
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('evidence_packages')
      .select('id, engagement_id, status, created_at, zip_path')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch evidence packages:', error);
      return NextResponse.json({ error: 'Failed to load evidence packages' }, { status: 500 });
    }

    // Return an empty array if no packages exist
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    console.error('Unexpected error in evidence history API:', e);
    return NextResponse.json({ error: 'Failed to load evidence packages' }, { status: 500 });
  }
}
