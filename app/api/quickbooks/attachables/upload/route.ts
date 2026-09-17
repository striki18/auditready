import { NextResponse } from 'next/server';
import { uploadAttachable } from '@/lib/quickbooks';

/**
 * POST /api/quickbooks/attachables/upload
 *
 * Upload an attachable file to QuickBooks Online.
 *
 * Expected multipart/form-data:
 * - file: The file to upload (required)
 * - entityType: QuickBooks entity type (e.g., 'Invoice', 'Bill', 'PurchaseOrder') (required)
 * - entityId: QuickBooks entity ID to attach the file to (required)
 *
 * Returns the QBO Attachable response or structured error.
 */
export async function POST(request: Request) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract required fields
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;

    // Validate all three required fields
    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 }
      );
    }

    if (!entityType) {
      return NextResponse.json(
        { error: 'Missing required field: entityType' },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { error: 'Missing required field: entityId' },
        { status: 400 }
      );
    }

    // Convert file to bytes
    const fileBytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileBytes);

    // Get filename and content type from the uploaded file
    const filename = file.name;
    const contentType = file.type || 'application/octet-stream';

    console.log('🔍 Upload API: filename:', filename, 'contentType:', contentType);
    console.log('🔍 Upload API: entityType:', entityType, 'entityId:', entityId);
    console.log('🔍 Upload API: file size:', fileBuffer.length, 'bytes');

    // Call the uploadAttachable function
    const result = await uploadAttachable(
      fileBuffer,
      filename,
      contentType,
      entityType,
      entityId
    );

    // Return the QBO result
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Attachable upload endpoint error:', e);

    // Return structured error with status code from QBO if available
    const status = e?.status || 500;
    return NextResponse.json(
      { error: e.message || 'Upload failed' },
      { status }
    );
  }
}
