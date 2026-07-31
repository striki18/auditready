import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/evidence/document/[id]
 *
 * Returns a signed download URL for a specific evidence document.
 *
 * Responses:
 *   200 – JSON with document metadata and signed URL
 *   400 – Invalid UUID supplied
 *   404 – Document not found
 *   500 – Signed URL generation failure
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Fetch document metadata
  const { data: doc, error: docError } = await supabase
    .from('evidence_documents')
    .select('id, filename, content_type, file_size, storage_path')
    .eq('id', id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Generate signed URL (10 minutes = 600 seconds)
  const { data: signedData, error: signedError } = await supabaseAdmin
    .storage
    .from('evidence')
    .createSignedUrl(doc.storage_path, 600);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: signedError?.message ?? 'Failed to generate signed URL' }, { status: 500 });
  }

  return NextResponse.json({
    id: doc.id,
    filename: doc.filename,
    contentType: doc.content_type,
    size: doc.file_size,
    downloadUrl: signedData.signedUrl,
    expiresIn: 600,
  }, { status: 200 });
}

/**
 * DELETE /api/evidence/document/[id]
 *
 * Permanently removes an evidence document both from Supabase Storage and the
 * `evidence_documents` table.
 *
 * Responses:
 *   200 – Document deleted successfully
 *   400 – Invalid UUID supplied
 *   404 – Document not found
 *   500 – Storage or database error
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Fetch document metadata to obtain storage_path
  const { data: doc, error: docError } = await supabase
    .from('evidence_documents')
    .select('id, storage_path')
    .eq('id', id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Delete the file from Supabase Storage
  const { error: storageError } = await supabaseAdmin
    .storage
    .from('evidence')
    .remove([doc.storage_path]);

  if (storageError) {
    // Storage deletion failed – do not touch DB
    return NextResponse.json({ error: storageError.message ?? 'Failed to delete storage object' }, { status: 500 });
  }

  // Delete the row from the database
  const { error: dbError } = await supabase
    .from('evidence_documents')
    .delete()
    .eq('id', id);

  if (dbError) {
    // DB deletion failed after storage deletion – report error
    return NextResponse.json({ error: dbError.message ?? 'Failed to delete database record' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
}
