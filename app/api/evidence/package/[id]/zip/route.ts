import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Verify package exists
  const { data: pkg, error: pkgError } = await supabase
    .from('evidence_packages')
    .select('id')
    .eq('id', id)
    .single();
  if (pkgError || !pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  // Scaffold response – do not generate ZIP or modify any state
  return NextResponse.json({ packageId: id, status: 'ready' }, { status: 200 });
}
