import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/evidence/package/[id]/download
 *
 * Returns a signed URL for downloading the generated evidence package zip.
 *
 * Steps:
 *   1. Validate the package ID is a UUID.
 *   2. Verify the package exists in `evidence_packages`.
 *   3. Ensure the package status is "ready".
 *   4. Ensure a `zip_path` is present.
 *   5. Generate a signed URL (valid for 600 seconds) using Supabase Storage.
 *   6. Return JSON with packageId, downloadUrl, expiresIn.
 */
export async function GET(request: NextRequest) {
  // Extract the package ID from the route parameters.
  // Next.js provides params as a Promise in the second argument, but in this
  // file we are using the dynamic route folder name, so we need to read it from
  // the URL path.
  const url = new URL(request.url);
  const pathname = url.pathname; // e.g., /api/evidence/package/<id>/download
  const parts = pathname.split('/');
  const id = parts[parts.length - 2]; // the segment before 'download'

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  // 2. Verify package exists and retrieve zip_path and status.
  const { data: pkg, error: pkgError } = await supabaseAdmin
    .from('evidence_packages')
    .select('id, status, zip_path')
    .eq('id', id)
    .single();
  if (pkgError || !pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  // 3. Verify status is ready.
  if (pkg.status !== 'ready') {
    return NextResponse.json({ error: 'Package not ready' }, { status: 409 });
  }

  // 4. Verify zip_path exists.
  if (!pkg.zip_path) {
    // Instrumentation: log missing zip_path error with package details
    console.error('Package zip path missing', { pkg });
    return NextResponse.json({ error: 'Package zip path missing' }, { status: 500 });
  }

  // 5. Generate signed URL.
  const { data: signedData, error: signedError } = await supabaseAdmin
    .storage
    .from('evidence')
    .createSignedUrl(pkg.zip_path, 600);
  if (signedError || !signedData) {
    // Instrumentation: log signed URL generation error details
    console.error('Failed to generate signed URL', { signedError, signedData });
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }

  // 6. Return response.
  return NextResponse.json({
    packageId: pkg.id,
    downloadUrl: signedData.signedUrl,
    expiresIn: 600,
  });
}
