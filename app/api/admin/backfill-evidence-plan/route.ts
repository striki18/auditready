import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/admin/backfill-evidence-plan
 *
 * Administrative one‑time endpoint that ensures every engagement has a full
 * evidence‑plan (one row per catalog item). It is safe to run multiple times –
 * rows that already exist are left untouched thanks to the unique constraint
 * (engagement_id, catalog_id) and the use of `upsert` with `onConflict`.
 */
export async function POST() {
  try {
    // 1️⃣ Load all engagements
    const { data: engagementsRaw, error: engErr } = await supabase
      .from('audit_engagements')
      .select('id')
      .order('created_at', { ascending: true });
    if (engErr) throw engErr;

    // Ensure we always have an array to iterate over (Supabase may return null on empty set)
    const engagements = (engagementsRaw ?? []) as any[];

    let engagementsScanned = 0;
    let engagementsRepaired = 0;
    let rowsInserted = 0;
    let engagementsSkipped = 0;

    // 2️⃣ Process each engagement
    for (const eng of engagements) {
      engagementsScanned++;
      const engagementId = eng.id;

      // Count existing plan rows for this engagement
      const { count } = await supabase
        .from('audit_evidence_plan')
        .select('id', { count: 'exact', head: true })
        .eq('engagement_id', engagementId);

      const existingCount = Number(count ?? 0);
      if (existingCount > 0) {
        engagementsSkipped++;
        continue; // already has a plan – skip
      }

      // 2️⃣⟹ Fetch the full catalog ordered by display_order
      const { data: catalog, error: catErr } = await supabase
        .from('audit_evidence_catalog')
        .select('id')
        .order('display_order', { ascending: true });
      if (catErr) throw catErr;

      // Build rows – one per catalog entry
      const planRows = (catalog as any[]).map(item => ({
        engagement_id: engagementId,
        catalog_id: item.id,
        status: 'pending',
      }));

      // 3️⃣ Insert using upsert to respect the UNIQUE constraint
      const { error: insErr } = await supabase
        .from('audit_evidence_plan')
        .upsert(planRows, { onConflict: 'engagement_id,catalog_id' });
      if (insErr) throw insErr;

      // All rows in planRows are intended to exist after upsert; count them
      rowsInserted += planRows.length;
      engagementsRepaired++;
    }

    const result = {
      engagements_scanned: engagementsScanned,
      engagements_repaired: engagementsRepaired,
      rows_inserted: rowsInserted,
      engagements_skipped: engagementsSkipped,
    };
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Backfill evidence plan error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
