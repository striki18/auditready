import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/evidence/request/[id]/documents
 *
 * Returns a list of uploaded documents for the given evidence request.
 *
 * Responses:
 *   200 – JSON array of document metadata (may be empty)
 *   400 – Invalid UUID supplied
 *   404 – Evidence request not found
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Resolve route params (Next.js provides a Promise)
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Verify the evidence request exists
  const { data: requestData, error: requestError } = await supabase
    .from('evidence_requests')
    .select('id')
    .eq('id', id)
    .single();
  if (requestError || !requestData) {
    return NextResponse.json({ error: 'Evidence request not found' }, { status: 404 });
  }

  // Query documents belonging to this request, newest first
  const { data: docs, error: docsError } = await supabase
    .from('evidence_documents')
    .select('id, filename, content_type, file_size, storage_path, uploaded_at')
    .eq('evidence_request_id', id)
    .order('uploaded_at', { ascending: false });

  if (docsError) {
    // Unexpected DB error – treat as server error
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }

  const result = (docs ?? []).map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    contentType: doc.content_type,
    size: doc.file_size,
    path: doc.storage_path,
    uploadedAt: doc.uploaded_at,
  }));

  return NextResponse.json(result, { status: 200 });
}
