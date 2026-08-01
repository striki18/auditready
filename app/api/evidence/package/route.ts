import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/evidence/package
 *
 * Generates an evidence package manifest for a given engagement.
 * The request body must contain:
 *   { "engagementId": "<uuid>" }
 *
 * Steps:
 *   1. Validate the UUID.
 *   2. Verify the engagement exists.
 *   3. Retrieve all evidence_requests for the engagement together with the
 *      associated catalog evidence name (used as folder name).
 *   4. Retrieve all evidence_documents linked to those requests.
 *   5. Insert a row into `evidence_packages` with status "generated".
 *   6. Insert a row into `evidence_package_items` for each document.
 *   7. Return the package metadata.
 */
export async function POST(request: NextRequest) {
  // 1. Parse and validate payload
  let payload: any;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { engagementId } = payload ?? {};
  if (!engagementId) {
    return NextResponse.json({ error: 'engagementId is required' }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(engagementId)) {
    return NextResponse.json({ error: 'Invalid engagementId' }, { status: 400 });
  }

  // 2. Verify engagement exists
  const { data: engagement, error: engagementError } = await supabase
    .from('audit_engagements')
    .select('id')
    .eq('id', engagementId)
    .single();
  if (engagementError || !engagement) {
    return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  }

  // 3. Retrieve evidence_requests with catalog evidence_name (folder name)
  const { data: requests, error: reqError } = await supabase
    .from('evidence_requests')
    .select(
      `id, plan_id, audit_evidence_plan ( catalog_id, audit_evidence_catalog ( evidence_name ) )`
    )
    .eq('engagement_id', engagementId);
  if (reqError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // If no requests, still create an empty package (documentCount 0)
  const requestMap: Record<string, string> = {};
  (requests ?? []).forEach((req: any) => {
    const folderName =
      req.audit_evidence_plan?.audit_evidence_catalog?.evidence_name || `Request-${req.id}`;
    requestMap[req.id] = folderName;
  });

  // 4. Retrieve all documents for these requests
  const requestIds = Object.keys(requestMap);
  let documents: any[] = [];
  if (requestIds.length > 0) {
    const { data: docs, error: docsError } = await supabase
      .from('evidence_documents')
      .select('id, evidence_request_id, filename, storage_path')
      .in('evidence_request_id', requestIds);
    if (docsError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    documents = docs ?? [];
  }

  // 5. Insert package row
  const { data: pkgData, error: pkgError } = await supabase
    .from('evidence_packages')
    .insert({ engagement_id: engagementId, status: 'generated' })
    .select();
  if (pkgError || !pkgData) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  const packageRow = Array.isArray(pkgData) ? pkgData[0] : pkgData;
  const packageId = packageRow.id;

  // 6. Insert package items for each document
  const packageItems = documents.map((doc) => ({
    package_id: packageId,
    document_id: doc.id,
    folder_name: requestMap[doc.evidence_request_id] ?? 'unknown',
    filename: doc.filename,
    storage_path: doc.storage_path,
  }));

  if (packageItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('evidence_package_items')
      .insert(packageItems);
    if (itemsError) {
      // Attempt to clean up the orphaned package
      await supabase.from('evidence_packages').delete().eq('id', packageId);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  // 7. Return response
  return NextResponse.json({
    packageId,
    engagementId,
    status: 'generated',
    documentCount: packageItems.length,
  });
}
