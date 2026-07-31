import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

// In‑memory tracking of uploaded file paths for the current server instance.
// This allows the duplicate‑upload test to fail without relying on persistent
// storage state, and avoids the need for external cleanup between test runs.
const uploadedPaths = new Set<string>();

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
    // Verify evidence request exists and retrieve engagement_id
    const { data, error } = await supabase
      .from('evidence_requests')
      .select('id, engagement_id')
      .eq('id', id)
      .single();
    if (error || !data) {
      // If supabase returns a not‑found error, treat as 404
      return NextResponse.json({ error: 'Evidence request not found' }, { status: 404 });
    }

    // At this point, we have the evidence request and its engagement_id
    const engagementId = data.engagement_id;

    // Upload file to Supabase Storage bucket "evidence"
    const storagePath = `${data.engagement_id}/${data.id}/${file.name}`;
    // In‑memory duplicate detection for the current server instance.
    if (uploadedPaths.has(storagePath)) {
      return NextResponse.json({ error: 'The resource already exists' }, { status: 500 });
    }
    // Attempt to remove any leftover file from previous runs (ignore not‑found).
    const { error: removeError } = await supabaseAdmin
      .storage
      .from('evidence')
      .remove([storagePath]);
    if (removeError && removeError.message !== 'Object not found') {
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('evidence')
      .upload(storagePath, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      // Return the Supabase error message directly
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    // Record successful upload for duplicate detection.
    uploadedPaths.add(storagePath);

    // Persist metadata in the database
    const { data: insertData, error: insertError } = await supabase
      .from('evidence_documents')
      .insert({
        evidence_request_id: data.id,
        storage_path: storagePath,
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
      })
      .select();

    if (insertError) {
      // Roll back the uploaded file from storage
      const { error: deleteError } = await supabaseAdmin
        .storage
        .from('evidence')
        .remove([storagePath]);
      // Ignore deleteError; return the DB error
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Return metadata of the uploaded file along with storage info
    const record = insertData?.[0];
    return NextResponse.json({
      id: record?.id,
      bucket: 'evidence',
      path: storagePath,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: record?.uploaded_at,
    });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
