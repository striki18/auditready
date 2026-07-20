import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/** GET /api/evidence/plan?engagement_id=<uuid>
 * Returns the evidence plan for the given engagement, joined with catalog data.
 * Returns 400 if engagement_id is missing.
 * Returns [] if no plan rows exist for the engagement.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const engagementId = searchParams.get('engagement_id');
    if (!engagementId) {
      return NextResponse.json({ error: 'engagement_id is required' }, { status: 400 });
    }

    // Join audit_evidence_plan with audit_evidence_catalog to get required fields
    const { data, error } = await supabase
      .from('audit_evidence_plan')
      .select(
        `id, status, catalog_id, engagement_id, 
         audit_evidence_catalog (evidence_name, category, description, owner_type, auto_collectable, display_order)`
      )
      .eq('engagement_id', engagementId);

    if (error) {
      console.error('Failed to load evidence plan:', error);
      return NextResponse.json({ error: 'Failed to load evidence plan' }, { status: 500 });
    }

    // Transform the nested result into a flat object per specification
    const result = (data as any[]).map(row => ({
      id: row.id,
      catalog_id: row.catalog_id,
      evidence_name: row.audit_evidence_catalog.evidence_name,
      category: row.audit_evidence_catalog.category,
      description: row.audit_evidence_catalog.description,
      owner_type: row.audit_evidence_catalog.owner_type,
      auto_collectable: row.audit_evidence_catalog.auto_collectable,
      status: row.status,
      display_order: row.audit_evidence_catalog.display_order,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Unexpected error loading evidence plan:', e);
    return NextResponse.json({ error: 'Failed to load evidence plan' }, { status: 500 });
  }
}
