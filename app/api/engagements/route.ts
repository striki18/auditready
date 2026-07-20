import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCompanyInfo } from '@/lib/quickbooks';

/** POST /api/engagements – create a new audit engagement */
export async function POST(request: Request) {
  try {
    // Read raw request body and attempt to parse JSON.
    const raw = await request.text();
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      // Attempt a tolerant parse: add quotes around unquoted keys.
      const tolerant = raw.replace(/([a-zA-Z0-9_]+):/g, '"$1":');
      try {
        payload = JSON.parse(tolerant);
      } catch (e) {
        console.error('Failed to parse JSON payload (even tolerant):', raw);
        throw new Error('Invalid JSON payload');
      }
    }
    const {
      realm_id,
      company_name,
      audit_type,
      start_date,
      end_date,
    } = payload;

    if (!realm_id || !company_name || !audit_type || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing draft engagement with same parameters to avoid duplicates.
    const { data: existing, error: existingErr } = await supabase
      .from('audit_engagements')
      .select('*')
      .eq('realm_id', realm_id)
      .eq('audit_type', audit_type)
      .eq('start_date', start_date)
      .eq('end_date', end_date)
      .eq('status', 'draft')
      .single();
    if (existingErr && existingErr.code !== 'PGRST116') {
      // PGRST116 = No rows found – ignore.
      throw existingErr;
    }
    if (existing) {
      // Return the existing engagement instead of creating a new one.
      return NextResponse.json(existing);
    }

    // Insert and return the inserted row.
    const { data, error } = await supabase
      .from('audit_engagements')
      .insert([
        {
          realm_id,
          company_name,
          audit_type,
          start_date,
          end_date,
        },
      ])
      .select();
    if (error) throw error;
    // If Supabase didn't return data (e.g., due to policy), fall back to the payload.
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('Supabase insert returned no data; returning request payload');
      return NextResponse.json({
        realm_id,
        company_name,
        audit_type,
        start_date,
        end_date,
        status: 'draft',
      });
    }
    // data is an array of inserted rows
    const inserted = data as any[];
    return NextResponse.json(inserted[0]);
  } catch (e: any) {
    console.error('Create engagement error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** GET /api/engagements – list all audit engagements */
export async function GET() {
  try {
    // Fetch all engagements ordered by creation time (oldest first)
    const { data, error } = await supabase
      .from('audit_engagements')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      const [oldest, ...duplicates] = data;
      // Delete any duplicate rows, keeping the oldest.
      if (duplicates.length > 0) {
        const idsToDelete = duplicates.map((row: any) => row.id);
        await supabase.from('audit_engagements').delete().in('id', idsToDelete);
      }
      // Ensure the company_name matches the current QuickBooks company name.
      try {
        const qbInfo = await getCompanyInfo();
        const correctName = qbInfo?.CompanyInfo?.CompanyName;
        if (correctName && oldest.company_name !== correctName) {
          const { error: updErr } = await supabase
            .from('audit_engagements')
            .update({ company_name: correctName })
            .eq('id', oldest.id);
          if (updErr) throw updErr;
          oldest.company_name = correctName;
        }
      } catch (e) {
        console.error('Failed to sync company name from QuickBooks:', e);
      }
      return NextResponse.json([oldest]);
    }
    // No engagements exist
    return NextResponse.json([]);
  } catch (e: any) {
    console.error('Fetch engagements error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
