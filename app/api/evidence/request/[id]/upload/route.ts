import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/evidence/request/[id]/upload
 *
 * Accepts a multipart/form-data request with a single field `file`.
 * Validates the presence and non‑emptiness of the file, looks up the
 * evidence request by the route param `id`, and returns the uploaded
 * file's metadata.
 *
 * Responses:
 *   200 – `{ filename, contentType, size }`
 *   400 – missing file or empty file
 *   404 – evidence request not found
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Resolve route params (Next.js provides a Promise)
    const { id } = await params;

    // Validate id presence and format (UUID)
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      // If parsing form data fails (e.g., no multipart body), treat as missing file
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const file = formData.get('file');
    // The `file` should be a File object
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'file is empty' }, { status: 400 });
    }

    // Verify evidence request exists
    const { data, error } = await supabase
      .from('evidence_requests')
      .select('id')
      .eq('id', id)
      .single();
    if (error || !data) {
      // If supabase returns a not‑found error, treat as 404
      return NextResponse.json({ error: 'Evidence request not found' }, { status: 404 });
    }

    // Return metadata of the uploaded file
    return NextResponse.json({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });
  } catch (e: any) {
    console.error('Unexpected error in evidence request upload POST:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
