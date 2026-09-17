import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find the inbox by token
    const { data: inbox, error: inboxError } = await supabaseAdmin
      .from('company_inboxes')
      .select('realm_id')
      .eq('token', token)
      .single();

    if (inboxError || !inbox) {
      return NextResponse.json({ error: 'Invalid inbox link' }, { status: 404 });
    }

    const realmId = inbox.realm_id;
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `inbox/${realmId}/${token}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from('evidence')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
      }

      // Store document metadata
      const { data: document, error: docError } = await supabaseAdmin
        .from('inbox_documents')
        .insert({
          realm_id: realmId,
          storage_path: storagePath,
          filename: file.name,
          content_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (docError) {
        console.error('Document insert error:', docError);
        return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 });
      }

      uploadedDocuments.push(document);
    }

    return NextResponse.json({ documents: uploadedDocuments }, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      // List all documents for this inbox
      const { data: inbox, error: inboxError } = await supabaseAdmin
        .from('company_inboxes')
        .select('realm_id')
        .eq('token', token)
        .single();

      if (inboxError || !inbox) {
        return NextResponse.json({ error: 'Invalid inbox link' }, { status: 404 });
      }

      const { data: documents, error } = await supabaseAdmin
        .from('inbox_documents')
        .select('*')
        .eq('realm_id', inbox.realm_id)
        .like('storage_path', `inbox/${inbox.realm_id}/${token}/%`)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Documents fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
      }

      return NextResponse.json({ documents });
    }

    // Get single document metadata
    const { data: document, error } = await supabaseAdmin
      .from('inbox_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Create signed URL for download (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
      .from('evidence')
      .createSignedUrl(document.storage_path, 3600);

    if (urlError || !signedUrl) {
      console.error('Error creating signed URL:', urlError);
      return NextResponse.json({ error: 'Failed to create download link' }, { status: 500 });
    }

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl.signedUrl);
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}